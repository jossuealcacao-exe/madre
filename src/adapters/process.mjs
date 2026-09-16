import { spawn } from 'node:child_process';

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
  label,
  parse,
  signal,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(`${label} was interrupted before it started: ${typeof signal.reason === 'string' ? signal.reason : 'PULSE is shutting down'}.`));
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
        finish(() => reject(error));
      }, idleTimeoutMs);
      idleTimer.unref?.();
    };

    const onAbort = () => {
      terminateProcessTree(child, { graceMs: killGraceMs });
      const reason = typeof signal?.reason === 'string' ? signal.reason : 'PULSE is shutting down';
      finish(() => reject(new Error(`${label} was interrupted: ${reason}.`)));
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
      finish(() => reject(new Error(`${label} did not respond before the timeout (${Math.round(timeoutMs / 1000)}s).${lastLine ? ` Last output: ${lastLine.slice(0, 200)}` : ''}`)));
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (chunk) => { stdout += chunk; lastActivity = Date.now(); });
    child.stderr.on('data', (chunk) => { stderr += chunk; lastActivity = Date.now(); });
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
