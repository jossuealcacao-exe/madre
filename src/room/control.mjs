// CONTROL: one agent holds the project itself for one turn. A git checkpoint
// is taken before, the diff is read after, writes into forbidden zones are
// restored on the spot, and the checkpoint stays for UNDO. One holder at a time.

import { createCheckpoint, diffCheckpoint, restoreCheckpoint } from '../checkpoint.mjs';

export class ControlDesk {
  #projectRoot;
  #holder = null;             // { agent, messageId, checkpoint, since }
  #checkpoints = new Map();   // id -> checkpoint (for UNDO after the turn)

  constructor({ projectRoot }) {
    this.#projectRoot = projectRoot;
  }
  get holder() { return this.#holder; }
  status() {
    return this.#holder ? { agent: this.#holder.agent, messageId: this.#holder.messageId, checkpointId: this.#holder.checkpoint.id, since: this.#holder.since } : null;
  }

  // Takes the checkpoint and seats the agent. Returns the run, the lease that
  // makes the whole project writable, and what the room should announce.
  async begin({ agent, messageId, enabledScopes }) {
    const checkpoint = await createCheckpoint(this.#projectRoot, { id: `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${messageId.slice(0, 8)}`, label: `MADRE control @${agent.id}` });
    checkpoint.agent = agent.id;
    this.#checkpoints.set(checkpoint.id, checkpoint);
    const run = { agent: agent.id, messageId, checkpoint, since: new Date().toISOString() };
    this.#holder = run;
    const lease = { leaseId: checkpoint.id, outDir: this.#projectRoot, relativeDir: '.', scopes: { ...enabledScopes, write: true }, control: true, checkpoint };
    const announcement = { checkpointId: checkpoint.id, commit: checkpoint.commit, head: checkpoint.head, agent: agent.id, messageId, message: `@${agent.id} holds CONTROL of the project. Checkpoint ${checkpoint.commit.slice(0, 7)} taken; UNDO will be one click.` };
    return { run, lease, announcement };
  }

  // What really changed, with forbidden zones already restored.
  async settle(run) {
    const diff = await diffCheckpoint(this.#projectRoot, run.checkpoint);
    let reverted = [];
    if (diff.forbidden.length) {
      const restored = await restoreCheckpoint(this.#projectRoot, run.checkpoint, { paths: diff.forbidden });
      reverted = [...restored.restored, ...restored.removed];
    }
    const changes = { checkpointId: run.checkpoint.id, agent: run.agent, messageId: run.messageId, files: diff.files.filter((file) => !diff.forbidden.includes(file.path)), stat: diff.stat, forbiddenReverted: reverted };
    const count = changes.files.length;
    const note = reverted.length ? ` ${reverted.length} write(s) into forbidden zones were reverted.` : '';
    changes.message = `${count ? `@${run.agent} changed ${count} file(s) in the project.` : `@${run.agent} changed nothing in the project.`}${note}`;
    return changes;
  }

  // Whichever way the turn ended, the seat is free again; the checkpoint stays.
  release(run) {
    if (run && this.#holder === run) this.#holder = null;
  }

  async undo(checkpointId) {
    const checkpoint = this.#checkpoints.get(checkpointId);
    if (!checkpoint) return { ok: false, status: 404, error: 'That checkpoint is not known to this room.' };
    if (this.#holder?.checkpoint.id === checkpointId) return { ok: false, status: 409, error: 'That CONTROL turn is still running; STOPALL first.' };
    const result = await restoreCheckpoint(this.#projectRoot, checkpoint);
    return { ok: true, checkpoint, ...result, message: `Project restored to the checkpoint taken before @${checkpoint.agent}'s CONTROL turn: ${result.restored.length} file(s) restored, ${result.removed.length} removed.` };
  }
}
