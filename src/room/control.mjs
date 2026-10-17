// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// CONTROL: one agent holds the project itself for one turn. A git checkpoint
// is taken before, the diff is read after, writes into forbidden zones are
// restored on the spot, and the checkpoint stays for UNDO. One holder at a time.

import { createCheckpoint, diffCheckpoint, restoreCheckpoint, settleControls } from '../checkpoint.mjs';
import { guardForbidden } from './guard.mjs';

export class ControlDesk {
  #projectRoot;
  #holder = null;             // { agent, messageId, checkpoint, since }
  #checkpoints = new Map();   // id -> checkpoint (for UNDO after the turn)
  // Every turn writing in the project right now, CREATE or CONTROL, in any conversation. Two at
  // once cannot be told apart afterwards: each settles against its own photograph and claims, or
  // puts back, what the other wrote. A README one conversation's OpenCode created was listed as
  // the work of another conversation's Codex. So the project has one writer at a time.
  #writers = new Set();
  #waiting = [];

  #guardRecord;

  // `guardRecord`: where the locks of a turn are written down, outside the project (room/guard.mjs).
  constructor({ projectRoot, guardRecord = null }) {
    this.#projectRoot = projectRoot;
    this.#guardRecord = guardRecord;
  }
  get holder() { return this.#holder; }
  // Who is writing now, for the line that says why a turn is waiting.
  writer() { return [...this.#writers][0] ?? null; }

  // The project's one pen: taken the moment it is free, in the same tick it is seen free, so two
  // turns can never both find it free. Waits otherwise; a stop while waiting rejects, and the
  // turn ends having written nothing.
  async #takePen(signal = null, agent = null) {
    while (this.#writers.size) {
      await new Promise((resolve, reject) => {
        const entry = { resolve, reject };
        this.#waiting.push(entry);
        signal?.addEventListener?.('abort', () => {
          this.#waiting = this.#waiting.filter((one) => one !== entry);
          reject(Object.assign(new Error(String(signal.reason ?? 'stopped')), { code: 'ABORT_ERR' }));
        }, { once: true });
      });
    }
    const pen = { pen: true, agent };
    this.#writers.add(pen);
    return pen;
  }
  #wakeOne() {
    if (this.#writers.size) return;
    this.#waiting.shift()?.resolve();
  }
  status() {
    return this.#holder ? { agent: this.#holder.agent, messageId: this.#holder.messageId, checkpointId: this.#holder.checkpoint.id, since: this.#holder.since } : null;
  }

  // Takes the checkpoint and seats the agent. Returns the run, the lease that
  // makes the whole project writable, and what the room should announce.
  // mode 3 (CONTROL) seats one holder for the whole project; mode 2 (CREATE) takes the same
  // photograph without a seat: the project is writable for new files, and settle() puts back
  // whatever existed before. One writing turn at a time in the project, across conversations: a
  // second one waits for the pen (see #writers).
  async begin({ agent, messageId, enabledScopes, mode = 3, signal = null }) {
    const pen = await this.#takePen(signal, agent.id);
    let checkpoint;
    try {
      checkpoint = await createCheckpoint(this.#projectRoot, { id: `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${messageId.slice(0, 8)}`, label: `MADRE ${mode === 3 ? 'control' : 'create'} @${agent.id}` });
    } catch (error) {
      this.#writers.delete(pen);
      this.#wakeOne();
      throw error;
    }
    checkpoint.agent = agent.id;
    this.#checkpoints.set(checkpoint.id, checkpoint);
    // Prevention first: .env files and MADRE's folders are read-only for the length of the turn.
    const guard = await guardForbidden(this.#projectRoot, { record: this.#guardRecord });
    const run = { agent: agent.id, messageId, checkpoint, since: new Date().toISOString(), guard, mode, scratchDir: null };
    this.#writers.delete(pen);
    this.#writers.add(run);
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
    // What the turn wrote into a repository's own settings, hooks or attributes goes back first,
    // before git runs again (src/checkpoint.mjs). Not after #4: there the agent runs commands
    // already, and configuring a remote it was asked to configure is its work.
    const controls = run.mode === 4 ? [] : await settleControls(run.checkpoint);
    const diff = await diffCheckpoint(this.#projectRoot, run.checkpoint);
    const additive = run.mode === 2;
    // The draft folder MADRE itself hands the agent lives under `.pulse/out/`, and `.pulse/` is a
    // forbidden zone — so the room named a place to write, the agent wrote there, and the room
    // undid it. Nobody noticed here because this project ignores `.pulse/` and git never reported
    // the files; in a project that does not, `/module` never reached its install card. A turn's
    // own scratch folder is not a forbidden zone FOR THAT TURN. Every other `.pulse` path still is.
    const ownScratch = run.scratchDir ? `${run.scratchDir.replace(/\/$/, '')}/` : null;
    const mine = (path) => Boolean(ownScratch) && path.startsWith(ownScratch);
    const toRevert = new Set(diff.forbidden.filter((path) => !mine(path)));
    if (additive) for (const file of diff.files) if (file.status !== 'A') toRevert.add(file.path);
    // The copilot does not delete (src/room/copilot.mjs): what it removed comes back.
    const deleted = new Set(run.noDeletes ? diff.files.filter((file) => file.status === 'D').map((file) => file.path) : []);
    for (const path of deleted) toRevert.add(path);
    let reverted = [];
    if (toRevert.size) {
      const restored = await restoreCheckpoint(this.#projectRoot, run.checkpoint, { paths: [...toRevert] });
      reverted = [...restored.restored, ...restored.removed];
    }
    const kept = diff.files.filter((file) => !toRevert.has(file.path));
    const changes = { checkpointId: run.checkpoint.id, agent: run.agent, messageId: run.messageId, mode: run.mode ?? 3, files: kept, stat: diff.stat, ...(diff.afterTree ? { afterTree: diff.afterTree } : {}), forbiddenReverted: [...controls, ...reverted.filter((path) => diff.forbidden.includes(path) && !mine(path))], existingReverted: additive ? reverted.filter((path) => !diff.forbidden.includes(path)) : [], ...(deleted.size ? { deletesReverted: [...deleted] } : {}) };
    const count = changes.files.length;
    const notes = [
      changes.forbiddenReverted.length ? `${changes.forbiddenReverted.length} write(s) into forbidden zones were reverted.` : null,
      changes.existingReverted.length ? `${changes.existingReverted.length} change(s) to existing files were put back: CREATE only adds.` : null,
      deleted.size ? `${deleted.size} deleted file(s) were put back: the copilot does not delete.` : null,
    ].filter(Boolean).join(' ');
    changes.message = `${count ? `@${run.agent} ${additive ? 'created' : 'changed'} ${count} file(s) in the project.` : `@${run.agent} ${additive ? 'created' : 'changed'} nothing in the project.`}${notes ? ` ${notes}` : ''}`;
    return changes;
  }

  // What changed, or — when git cannot say — that it could not, with the checkpoint still there
  // for UNDO. A turn that finished is never turned into a failed one by the reading of it: its
  // answer was lost along with the list when this threw.
  async settleOrSay(run) {
    try {
      return await this.settle(run);
    } catch (error) {
      const reason = String(error?.stderr || error?.message || error).split('\n').map((line) => line.trim()).filter(Boolean).at(-1) ?? 'unknown error';
      return { checkpointId: run.checkpoint.id, agent: run.agent, messageId: run.messageId, mode: run.mode ?? 3, files: [], stat: '', forbiddenReverted: [], existingReverted: [], unreadable: reason, message: `MADRE could not read what @${run.agent} changed (${reason.slice(0, 160)}). The checkpoint taken before the turn is still there: UNDO goes back to it.` };
    }
  }

  // Whichever way the turn ended, the seat is free again and the locks come off; the checkpoint stays.
  async release(run) {
    if (!run) return;
    await run.guard?.release?.();
    if (this.#holder === run) this.#holder = null;
    if (this.#writers.delete(run)) this.#wakeOne();
  }

  // A photograph with no seat and no locks, for a command the human runs by hand: the human may
  // write anywhere, so nothing is guarded and nothing is reverted, but UNDO still has a place to
  // go back to. The same map as CONTROL's, so the same UNDO restores it.
  async photograph({ id, label, by = 'you', command = null }) {
    const checkpoint = await createCheckpoint(this.#projectRoot, { id, label });
    checkpoint.agent = by;
    checkpoint.command = command;
    this.#checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  async changesSince(checkpoint) {
    const { files, stat } = await diffCheckpoint(this.#projectRoot, checkpoint);
    return { files, stat };
  }

  async undo(checkpointId) {
    const checkpoint = this.#checkpoints.get(checkpointId);
    if (!checkpoint) return { ok: false, status: 404, error: 'That checkpoint is not known to this room.' };
    if (this.#holder?.checkpoint.id === checkpointId) return { ok: false, status: 409, error: 'That CONTROL turn is still running; STOPALL first.' };
    const result = await restoreCheckpoint(this.#projectRoot, checkpoint);
    const before = checkpoint.command ? `\`${checkpoint.command}\`` : `@${checkpoint.agent}'s CONTROL turn`;
    return { ok: true, checkpoint, ...result, message: `Project restored to the checkpoint taken before ${before}: ${result.restored.length} file(s) restored, ${result.removed.length} removed.` };
  }
}
