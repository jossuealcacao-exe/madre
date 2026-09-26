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
    const child = spawn(executable, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
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
    child.on('error', (error) => finish(() => {
      // spawn reports ENOENT for a missing cwd as well as a missing binary.
      if (error.code === 'ENOENT') {
        error.message = `${label} could not start: ${error.message}. Check that the project folder ${cwd} exists and that ${executable} is still installed.`;
      }
      reject(error);
    }));
    child.on('close', (code) => finish(() => {
      const response = parse(stdout);
      if (code === 0 && response.text) return resolve(response);
      reject(new Error(stderr.trim() || response.error || `${label} exited with code ${code}.`));
    }));
  });
}
