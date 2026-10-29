// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The human's hands for a command an agent asked for, in the project root, with no shell: the
// argv the parser split is the argv that runs (see src/runs.mjs).
//
// stdin is closed, so a program that wants to ask something reads end-of-file and gives up
// instead of hanging on a prompt nobody can see. The output is one stream, stdout and stderr
// interleaved the way a terminal shows them, and what is kept of a long one is its start and its
// end: a test run says what it is at the top and how it went at the bottom.
//
// A command that opens a port is a server, and a server is meant to keep running: it is not held
// to the ten-minute limit, it stops when the human presses STOP on its card (or STOPALL), and while
// it serves another command may run beside it. Before this a dev server asked for by an agent died
// at 600 s, and while it lived nothing else could run and nothing on its card could stop it.

import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { terminateProcessTree } from '../adapters/process.mjs';
import { classifyListening } from '../ports.mjs';

const execFileAsync = promisify(execFile);

export const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const HEAD_CHARS = 4000;
const TAIL_CHARS = 14000;
// How a run is watched for a port: first look soon after it starts, then every so often, and not
// forever: a program that has opened no port by then is not a server.
const SERVING_FIRST_MS = 1200;
const SERVING_EVERY_MS = 2000;
const SERVING_WITHIN_MS = 45000;

export function keepEnds(text, { head = HEAD_CHARS, tail = TAIL_CHARS } = {}) {
  if (text.length <= head + tail) return text;
  const dropped = text.length - head - tail;
  return `${text.slice(0, head)}\n… ${dropped} characters of output left out …\n${text.slice(-tail)}`;
}

// What listens right now, with the process group of each listener: a dev server is often a child
// of what was started (npm → node), and it stays in the group the run was started as. Read-only,
// like every look at ports here. Windows has neither lsof nor process groups: nothing is found, and
// a run there is held to the limit as it always was.
export async function listenersByGroup() {
  if (process.platform === 'win32') return [];
  const listing = await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { timeout: 4000, maxBuffer: 2 * 1024 * 1024 }).then((out) => out.stdout, (error) => error?.stdout ?? '');
  const { ports, wider } = classifyListening(listing);
  const all = [...ports.map((one) => ({ ...one, host: '127.0.0.1' })), ...wider];
  if (!all.length) return [];
  const pids = [...new Set(all.map((one) => one.pid))];
  const groups = await execFileAsync('ps', ['-o', 'pid=,pgid=', '-p', pids.join(',')], { timeout: 4000 }).then((out) => out.stdout, () => '');
  const groupOf = new Map(groups.split('\n').map((line) => line.trim().split(/\s+/).map(Number)).filter(([pid, group]) => pid && group).map(([pid, group]) => [pid, group]));
  return all.map((one) => ({ port: one.port, host: one.host, pid: one.pid, group: groupOf.get(one.pid) ?? null }));
}

export class RunDesk {
  #runs = new Map();   // id -> { child, stoppedBy, serving }
  #listening;

  constructor({ listening = listenersByGroup } = {}) {
    this.#listening = listening;
  }

  // Busy is a command still working toward its answer; a server that is serving is not in the way.
  get busy() { return [...this.#runs.values()].some((run) => !run.serving); }
  serving() { return [...this.#runs.entries()].filter(([, run]) => run.serving).map(([id, run]) => ({ id, ...run.serving })); }
  // Whether a line whose id starts this way is still working toward its answer.
  runningFor(prefix) { return [...this.#runs.entries()].some(([id, run]) => id.startsWith(prefix) && !run.serving); }

  // Resolves with what happened when the process ends; never rejects. A program that could not
  // start is an answer too. `onServing` hears, once, that the run opened a port.
  run({ id = 'run', argv, cwd, timeoutMs = RUN_TIMEOUT_MS, env = process.env, onServing = null }) {
    return new Promise((resolve) => {
      const started = Date.now();
      // 'error' and 'close' can both arrive for one failed spawn; the first one is the answer.
      let settled = false;
      let watch = null;
      const done = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(watch);
        const record = this.#runs.get(id);
        this.#runs.delete(id);
        resolve({ ...result, serving: record?.serving ?? undefined, durationMs: Date.now() - started });
      };
      let child;
      try {
        child = spawn(argv[0], argv.slice(1), {
          cwd,
          env: { ...env, NO_COLOR: '1', FORCE_COLOR: '0', GIT_PAGER: 'cat', PAGER: 'cat' },
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
          detached: process.platform !== 'win32',
          windowsHide: true,
        });
      } catch (error) {
        done({ ok: false, exitCode: null, text: couldNotRun(argv[0], error) });
        return;
      }
      const record = { child, stoppedBy: null, serving: null };
      this.#runs.set(id, record);
      let output = '';
      // Bounded while it runs, not only at the end: a program that prints without stopping must
      // not grow the server's memory for as long as it lives.
      const take = (chunk) => {
        output += chunk;
        if (output.length > (HEAD_CHARS + TAIL_CHARS) * 2) output = keepEnds(output);
      };
      // Decoded as a stream: a letter split between two chunks stays one letter (LOG-04).
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', take);
      child.stderr.on('data', take);
      const timer = setTimeout(() => { if (record.serving) return; record.stoppedBy = `timeout (${Math.round(timeoutMs / 1000)}s)`; terminateProcessTree(child); }, timeoutMs);
      timer.unref?.();
      // Is it serving? A listener whose process is the run, or in the run's process group.
      const look = async () => {
        if (settled || record.serving) return;
        const found = (await this.#listening({ pid: child.pid }).catch(() => [])).find((one) => one.pid === child.pid || (one.group && one.group === child.pid));
        if (settled) return;
        if (found) {
          record.serving = { port: found.port, host: found.host, network: !['127.0.0.1', '[::1]', 'localhost'].includes(found.host) };
          clearTimeout(timer);
          onServing?.(record.serving);
          return;
        }
        if (Date.now() - started < SERVING_WITHIN_MS) { watch = setTimeout(look, SERVING_EVERY_MS); watch.unref?.(); }
      };
      watch = setTimeout(look, SERVING_FIRST_MS);
      watch.unref?.();
      child.on('error', (error) => { clearTimeout(timer); done({ ok: false, exitCode: null, text: couldNotRun(argv[0], error) }); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const stoppedBy = record.stoppedBy;
        const tail = stoppedBy ? `\n[stopped: ${stoppedBy}]` : signal ? `\n[ended on ${signal}]` : code !== 0 ? `\n[exit code ${code}]` : '';
        // A server the human stopped ended the way it was meant to.
        const ok = record.serving ? Boolean(stoppedBy) || code === 0 : code === 0 && !stoppedBy;
        done({ ok, exitCode: code, signal: signal ?? undefined, stoppedBy: stoppedBy ?? undefined, text: `${keepEnds(output).trimEnd()}${tail}`.trim() });
      });
    });
  }

  // One run by its id, or every run (STOPALL).
  stop(reason = 'STOPALL', id = null) {
    const chosen = id ? [this.#runs.get(id)].filter(Boolean) : [...this.#runs.values()];
    for (const run of chosen) {
      run.stoppedBy = reason;
      terminateProcessTree(run.child);
    }
    return chosen.length > 0;
  }
}

function couldNotRun(program, error) {
  if (error?.code === 'ENOENT') return `${program} could not start: it is not installed, or not on the PATH MADRE was started with.`;
  return `${program} could not start: ${error?.message ?? error}`;
}
