// CONTROL: one agent holds the project itself for one turn. A git checkpoint
// is taken before, the diff is read after, writes into forbidden zones are
// restored on the spot, and the checkpoint stays for UNDO. One holder at a time.

import { createCheckpoint, diffCheckpoint, restoreCheckpoint } from '../checkpoint.mjs';
import { guardForbidden } from './guard.mjs';

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
  // mode 3 (CONTROL) seats one holder for the whole project; mode 2 (CREATE) takes the same
  // photograph without a seat: the project is writable for new files, and settle() puts back
  // whatever existed before. Several #2 turns may run at once.
  async begin({ agent, messageId, enabledScopes, mode = 3 }) {
    const checkpoint = await createCheckpoint(this.#projectRoot, { id: `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${messageId.slice(0, 8)}`, label: `MADRE ${mode === 3 ? 'control' : 'create'} @${agent.id}` });
    checkpoint.agent = agent.id;
    this.#checkpoints.set(checkpoint.id, checkpoint);
    // Prevention first: .env files and MADRE's folders are read-only for the length of the turn.
    const guard = await guardForbidden(this.#projectRoot);
    const run = { agent: agent.id, messageId, checkpoint, since: new Date().toISOString(), guard, mode };
    if (mode >= 3) this.#holder = run;
    const lease = { leaseId: checkpoint.id, outDir: this.#projectRoot, relativeDir: '.', scopes: { ...enabledScopes, write: true }, control: mode >= 3, airlock: mode === 4, create: mode === 2, checkpoint };
    if (mode < 3) return { run, lease, announcement: null };
    const guarded = guard.locked.length ? ` ${guard.locked.length} forbidden path${guard.locked.length === 1 ? '' : 's'} locked read-only for the turn (${guard.locked.slice(0, 4).join(', ')}${guard.locked.length > 4 ? ', …' : ''}).` : '';
    const announcement = { checkpointId: checkpoint.id, commit: checkpoint.commit, head: checkpoint.head, agent: agent.id, messageId, guarded: guard.locked, mode, message: `@${agent.id} holds ${mode === 4 ? 'AIRLOCK' : 'CONTROL'} of the project.${mode === 4 ? ' Commands run; pushes and deploys leave the ship and do not come back with UNDO.' : ''} Checkpoint ${checkpoint.commit.slice(0, 7)} taken; UNDO will be one click.${guarded}` };
    return { run, lease, announcement };
  }

  // What really changed, with forbidden zones already restored. In a #2 turn every change to
  // a file that existed before (modified, deleted, renamed) is restored too: CREATE adds, only.
  async settle(run) {
    const diff = await diffCheckpoint(this.#projectRoot, run.checkpoint);
    const additive = run.mode === 2;
    const toRevert = new Set(diff.forbidden);
    if (additive) for (const file of diff.files) if (file.status !== 'A') toRevert.add(file.path);
    let reverted = [];
    if (toRevert.size) {
      const restored = await restoreCheckpoint(this.#projectRoot, run.checkpoint, { paths: [...toRevert] });
      reverted = [...restored.restored, ...restored.removed];
    }
    const kept = diff.files.filter((file) => !toRevert.has(file.path));
    const changes = { checkpointId: run.checkpoint.id, agent: run.agent, messageId: run.messageId, mode: run.mode ?? 3, files: kept, stat: diff.stat, forbiddenReverted: diff.forbidden.length ? reverted.filter((path) => diff.forbidden.includes(path)) : [], existingReverted: additive ? reverted.filter((path) => !diff.forbidden.includes(path)) : [] };
    const count = changes.files.length;
    const notes = [
      changes.forbiddenReverted.length ? `${changes.forbiddenReverted.length} write(s) into forbidden zones were reverted.` : null,
      changes.existingReverted.length ? `${changes.existingReverted.length} change(s) to existing files were put back: CREATE only adds.` : null,
    ].filter(Boolean).join(' ');
    changes.message = `${count ? `@${run.agent} ${additive ? 'created' : 'changed'} ${count} file(s) in the project.` : `@${run.agent} ${additive ? 'created' : 'changed'} nothing in the project.`}${notes ? ` ${notes}` : ''}`;
    return changes;
  }

  // Whichever way the turn ended, the seat is free again and the locks come off; the checkpoint stays.
  async release(run) {
    if (!run) return;
    await run.guard?.release?.();
    if (this.#holder === run) this.#holder = null;
  }

  async undo(checkpointId) {
    const checkpoint = this.#checkpoints.get(checkpointId);
    if (!checkpoint) return { ok: false, status: 404, error: 'That checkpoint is not known to this room.' };
    if (this.#holder?.checkpoint.id === checkpointId) return { ok: false, status: 409, error: 'That CONTROL turn is still running; STOPALL first.' };
    const result = await restoreCheckpoint(this.#projectRoot, checkpoint);
    return { ok: true, checkpoint, ...result, message: `Project restored to the checkpoint taken before @${checkpoint.agent}'s CONTROL turn: ${result.restored.length} file(s) restored, ${result.removed.length} removed.` };
  }
}
