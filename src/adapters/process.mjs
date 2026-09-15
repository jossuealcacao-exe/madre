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
  label,
  parse,
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (operation) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      operation();
    };
    const timer = setTimeout(() => {
      terminateProcessTree(child, { graceMs: killGraceMs });
      finish(() => reject(new Error(`${label} did not respond before the timeout.`)));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('close', (code) => finish(() => {
      const response = parse(stdout);
      if (code === 0 && response.text) return resolve(response);
      reject(new Error(stderr.trim() || response.error || `${label} exited with code ${code}.`));
    }));
  });
}
