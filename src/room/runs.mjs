// The human's hands for a command an agent asked for. One command at a time, in the project
// root, with no shell: the argv the parser split is the argv that runs (see src/runs.mjs).
//
// stdin is closed, so a program that wants to ask something reads end-of-file and gives up
// instead of hanging on a prompt nobody can see. The output is one stream, stdout and stderr
// interleaved the way a terminal shows them, and what is kept of a long one is its start and its
// end: a test run says what it is at the top and how it went at the bottom.

import { spawn } from 'node:child_process';
import { terminateProcessTree } from '../adapters/process.mjs';

export const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const HEAD_CHARS = 4000;
const TAIL_CHARS = 14000;

export function keepEnds(text, { head = HEAD_CHARS, tail = TAIL_CHARS } = {}) {
  if (text.length <= head + tail) return text;
  const dropped = text.length - head - tail;
  return `${text.slice(0, head)}\n… ${dropped} characters of output left out …\n${text.slice(-tail)}`;
}

export class RunDesk {
  #child = null;
  #stoppedBy = null;

  get busy() { return Boolean(this.#child); }

  // Resolves with what happened; never rejects. A program that could not start is an answer too.
  run({ argv, cwd, timeoutMs = RUN_TIMEOUT_MS, env = process.env }) {
    return new Promise((resolve) => {
      const started = Date.now();
      // 'error' and 'close' can both arrive for one failed spawn; the first one is the answer.
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        this.#child = null;
        resolve({ ...result, durationMs: Date.now() - started });
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
      this.#child = child;
      this.#stoppedBy = null;
      let output = '';
      // Bounded while it runs, not only at the end: a program that prints without stopping must
      // not grow the server's memory for ten minutes.
      const take = (chunk) => {
        output += chunk;
        if (output.length > (HEAD_CHARS + TAIL_CHARS) * 2) output = keepEnds(output);
      };
      child.stdout.on('data', take);
      child.stderr.on('data', take);
      const timer = setTimeout(() => { this.#stoppedBy = `timeout (${Math.round(timeoutMs / 1000)}s)`; terminateProcessTree(child); }, timeoutMs);
      timer.unref?.();
      child.on('error', (error) => { clearTimeout(timer); done({ ok: false, exitCode: null, text: couldNotRun(argv[0], error) }); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const stoppedBy = this.#stoppedBy;
        const tail = stoppedBy ? `\n[stopped: ${stoppedBy}]` : signal ? `\n[ended on ${signal}]` : code !== 0 ? `\n[exit code ${code}]` : '';
        done({ ok: code === 0 && !stoppedBy, exitCode: code, signal: signal ?? undefined, stoppedBy: stoppedBy ?? undefined, text: `${keepEnds(output).trimEnd()}${tail}`.trim() });
      });
    });
  }

  stop(reason = 'STOPALL') {
    if (!this.#child) return false;
    this.#stoppedBy = reason;
    terminateProcessTree(this.#child);
    return true;
  }
}

function couldNotRun(program, error) {
  if (error?.code === 'ENOENT') return `${program} could not start: it is not installed, or not on the PATH MADRE was started with.`;
  return `${program} could not start: ${error?.message ?? error}`;
}
