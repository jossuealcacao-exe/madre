import { spawn } from 'node:child_process';
import { t } from '../i18n.mjs';

function signalProcessGroup(child, signal) {
  if (!child.pid) return false;
  try {
    // Negative pid targets the whole process group created by `detached: true`,
    // so relaunched or wrapped CLI children die together with the launcher.
    process.kill(-child.pid, signal);
    return true;
  } catch {
    try {
      child.kill(signal);
      return true;
    } catch {
      return false;
    }
  }
}

export function terminateProcessTree(child, { graceMs = 2000 } = {}) {
  signalProcessGroup(child, 'SIGTERM');
  const escalation = setTimeout(() => signalProcessGroup(child, 'SIGKILL'), graceMs);
  escalation.unref?.();
  child.once('close', () => clearTimeout(escalation));
}

// A number is not a reason. A process that was signalled reports it two ways — node hands the
// signal itself when it killed the child, and a CLI that handles SIGTERM exits 128+n on its own —
// and both used to surface as a bare `exited with code 143`, which reads like a crash and is not
// one: something STOPPED it. Naming the signal is the difference between looking for a bug in the
// agent and looking for whoever pulled the plug.
const SIGNAL_MEANING = {
  SIGTERM: 'was stopped (SIGTERM) — something asked it to quit: STOP ALL, a timeout, or the room shutting down',
  SIGKILL: 'was killed outright (SIGKILL) — usually this machine running out of memory',
  SIGINT: 'was interrupted (SIGINT) — a Ctrl+C reached it',
  SIGHUP: 'lost its terminal (SIGHUP)',
};
function endedBy(code, closedBy) {
  const name = closedBy ?? (Number.isInteger(code) && code > 128 ? Object.keys(SIGNAL_MEANING).find((key) => code === 128 + { SIGHUP: 1, SIGINT: 2, SIGKILL: 9, SIGTERM: 15 }[key]) : null);
  if (name && SIGNAL_MEANING[name]) return `${SIGNAL_MEANING[name]}.`;
  if (name) return `ended on ${name}.`;
  return `exited with code ${code}.`;
}

// One explanation for a process that never ran, whichever way spawn refused. ENOENT is the
// ambiguous one: node says it for a missing binary and for a missing working directory alike,
// so the sentence names both instead of guessing which.
function couldNotStart(error, { label, executable, cwd }) {
  if (error?.code === 'ENOENT') {
    error.message = `${label} could not start: ${error.message}. Check that the project folder ${cwd} exists and that ${executable} is still installed — a CLI that updates itself can move out from under a room that is already open, and reopening it finds the new one.`;
  } else if (error && !String(error.message ?? '').startsWith(label)) {
    error.message = `${label} could not start: ${error.message}`;
  }
  return error;
}

export function runReadonlyProcess({
  executable,
  args,
  cwd,
  env = process.env,
  timeoutMs = 120000,
  killGraceMs = 2000,
  // Optional: give up when the process stays silent this long. Streaming
  // adapters use it to tell "thinking" from "hung"; batch ones leave it off.
  idleTimeoutMs = null,
  // Optional: inspect accumulated stderr as it arrives; return an Error to
  // stop the process now instead of waiting for the timeout (e.g. a CLI that
  // retries a 503 forever).
  watchStderr = null,
  label,
  parse,
  signal,
  // Called as output arrives, with everything received so far. The adapter decides what that
  // means: a CLI that streams its answer can be read as it writes, one that hands over a single
  // blob at the end will simply say nothing until then, and saying nothing is the honest answer.
  onProgress = null,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(t('{label} was interrupted before it started: {why}.', { label, why: typeof signal.reason === 'string' ? signal.reason : t('MADRE is shutting down') })));
      return;
    }
    // spawn fails two ways, and only one of them used to be explained. The asynchronous one
    // raises 'error' on the child; the synchronous one throws right here, before there is a
    // child to listen to — a binary replaced underneath a running room by an app that updates
    // itself, an option the platform refuses. That path handed the human a bare `spawn … ENOENT`
    // with nothing to act on, which is how a self-updating CLI looked like a broken product.
    let child;
    try {
      child = spawn(executable, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });
    } catch (error) {
      reject(couldNotStart(error, { label, executable, cwd }));
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    let lastActivity = Date.now();
    let idleTimer = null;
    const armIdle = () => {
      if (!idleTimeoutMs) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (settled) return;
        if (Date.now() - lastActivity < idleTimeoutMs) { armIdle(); return; }
        terminateProcessTree(child, { graceMs: killGraceMs });
        const lastLine = `${stderr}\n${stdout}`.split('\n').map((line) => line.trim()).filter(Boolean).at(-1);
        const error = new Error(`${label} went silent for ${Math.round(idleTimeoutMs / 1000)}s and was stopped.${lastLine ? ` Last output: ${lastLine.slice(0, 200)}` : ''}`);
        error.code = 'IDLE';
        error.partialOutput = stdout;
        error.partialStderr = stderr.slice(-2000);
        finish(() => reject(error));
      }, idleTimeoutMs);
      idleTimer.unref?.();
    };

    const onAbort = () => {
      terminateProcessTree(child, { graceMs: killGraceMs });
      const reason = typeof signal?.reason === 'string' ? signal.reason : t('MADRE is shutting down');
      finish(() => reject(new Error(t('{label} was interrupted: {why}.', { label, why: reason }))));
    };
    const finish = (operation) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(idleTimer);
      signal?.removeEventListener('abort', onAbort);
      operation();
    };
    const timer = setTimeout(() => {
      terminateProcessTree(child, { graceMs: killGraceMs });
      // The last thing the agent said is usually the reason it was slow.
      const lastLine = `${stderr}\n${stdout}`.split('\n').map((line) => line.trim()).filter(Boolean).at(-1);
      const error = new Error(t('{label} did not respond before the timeout ({seconds}s).', { label, seconds: Math.round(timeoutMs / 1000) }) + (lastLine ? t(' Last output: {output}', { output: lastLine.slice(0, 200) }) : ''));
      error.code = 'TIMEOUT';
      error.partialOutput = stdout;
      error.partialStderr = stderr.slice(-2000);
      finish(() => reject(error));
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });

    // Only complete stdout lines count as activity: a CLI's stderr spinner or
    // progress noise must not keep a silent model alive past the idle limit.
    // Blank keep-alive lines are not activity either.
    let toldAt = 0;
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (/\S/.test(String(chunk)) && String(chunk).includes('\n')) lastActivity = Date.now();
      // Throttled: a chatty CLI can produce hundreds of chunks a second and nobody needs to see
      // a number move that fast.
      if (onProgress && Date.now() - toldAt > 400) { toldAt = Date.now(); try { onProgress(stdout); } catch { /* a meter must never break a turn */ } }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (!watchStderr || settled) return;
      const verdict = watchStderr(stderr);
      if (!verdict) return;
      terminateProcessTree(child, { graceMs: killGraceMs });
      verdict.code ??= 'STDERR';
      verdict.partialOutput = stdout;
      verdict.partialStderr = stderr.slice(-2000);
      finish(() => reject(verdict));
    });
    armIdle();
    child.on('error', (error) => finish(() => reject(couldNotStart(error, { label, executable, cwd }))));
    child.on('close', (code, closedBy) => finish(() => {
      const response = parse(stdout);
      if (code === 0 && response.text) return resolve(response);
      // What happened first, what the CLI printed second, and never one dressed as the other.
      // This used to be `stderr.trim() || …`, so anything a CLI wrote on the way out became the
      // reason: a notice about an unrelated setting, a line saying it was reading stdin. The
      // facts that actually diagnose the turn — the exit code, or a clean exit with nothing to
      // show — were discarded by the `||` and never reached the human. A warning is not a cause.
      const printed = stderr.trim();
      // The room keeps one line of a failure, so the last thing the CLI printed rides on it —
      // labelled as output, the way a timeout carries it, and never as the cause.
      const lastLine = printed.split('\n').map((line) => line.trim()).filter(Boolean).at(-1);
      const why = response.error ?? ((code === 0
        ? `${label} exited cleanly without an answer.`
        : `${label} ${endedBy(code, closedBy)}`) + (lastLine ? t(' Last output: {output}', { output: lastLine.slice(0, 200) }) : ''));
      const error = new Error(printed ? `${why}\n\n${label} printed:\n${printed.slice(-600)}` : why);
      error.partialStderr = printed.slice(-2000);
      error.exitCode = code;
      reject(error);
    }));
  });
}
