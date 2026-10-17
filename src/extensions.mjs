// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { spawn } from 'node:child_process';
import { MODULES, moduleById, describeModules } from './modules/index.mjs';
export { gitToplevel, findOnPath } from './modules/helpers.mjs';

// Compatibility over the module registry (src/modules/): the same names the
// server and the tests have always used, now answered by one file per module.
export const EXTENSIONS = MODULES;
export const AHP = moduleById('ahp');
export const ASH = moduleById('ash');
export const RIPLEY = moduleById('ripley');
export const OLLAMA = moduleById('ollama');
export const extensionById = moduleById;

// Lists every module as MODULES shows it. `ollama` is the server's probe state;
// `services` may add what a server offers (imageKey, ollama wiring).
export async function listExtensions({ projectRoot, agents = [], config = {}, imageKey = async () => null, ollama = null, services = {}, env = process.env } = {}) {
  const ctx = {
    projectRoot, config, agents, env, room: null,
    readConfig: async () => config, updateConfig: async () => {}, record: async () => {},
    services: { imageKey, ollama: ollama ? { state: () => ollama, wire: async () => ollama, pull: async () => ({ ok: false, error: 'not available here' }) } : null, ...services },
  };
  return describeModules(ctx);
}

// Runs one installer inside the project, streaming output lines. `runner`
// lets tests substitute the real installer with a local script.
// `npm` and other Node CLIs are .cmd shims on Windows, which cannot be spawned directly.
//
// A sign-in is the same spawn with a human in the middle of it, so three knobs exist for it:
// `stdin: 'pipe'` opens a way back in (a CLI that asks for a pasted code reads it there),
// `onChild` hands the caller that way in, and `flushIdleMs` emits a line that never ends in a
// newline — a prompt like `Paste code here > ` — once the output has been still for that long.
// Without it the prompt sits in the buffer and the room shows a sign-in that says nothing.
// `ci: false` leaves CI out: Gemini reads it as "no browser here" and will not open one.
// A spinner redraws its line in place (back to the first column, then the next frame) and never
// ends it: only the last frame is the line, or a sign-in that waits fifteen minutes piles up
// thousands of them in one.
const REDRAW = '\u001b[999D';
const redrawn = (text) => { const at = text.lastIndexOf(REDRAW); return at < 0 ? text : text.slice(at + REDRAW.length).replace(/^\u001b\[J/, ''); };

export function runInstaller({ command, args, projectRoot, onLine, timeoutMs = 600000, heartbeatMs = 8000, env = process.env, stdin = 'ignore', onChild = null, flushIdleMs = 0, ci = true, quietNote = 'installer is quiet (npm install or git status can take a while)' }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, env: { ...env, NO_COLOR: '1', ...(ci ? { CI: '1' } : {}) }, stdio: [stdin, 'pipe', 'pipe'], shell: process.platform === 'win32', windowsHide: true });
    const started = Date.now();
    let lastOutput = started;
    let buffer = '';
    const emit = (line, stream) => { lastOutput = Date.now(); onLine?.(line, stream); };
    // Installers go quiet for long stretches (npm install, git status); say so.
    const heartbeat = setInterval(() => {
      // A half-line waiting on a human is said before the silence is reported, so the room shows
      // the question instead of the heartbeat that would otherwise be the only thing on screen.
      if (flushIdleMs && buffer.trim() && Date.now() - lastOutput >= flushIdleMs) { const partial = buffer.trim(); buffer = ''; emit(partial, 'stdout'); return; }
      if (Date.now() - lastOutput >= heartbeatMs) {
        onLine?.(`… still running · ${Math.round((Date.now() - started) / 1000)}s · ${quietNote}`, 'heartbeat');
        lastOutput = Date.now();
      }
    }, Math.min(flushIdleMs || heartbeatMs, heartbeatMs, 2000));
    heartbeat.unref?.();
    const feed = (chunk, stream) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = redrawn(buffer.slice(0, index)).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line.trim()) emit(line, stream);
      }
      buffer = redrawn(buffer);
    };
    child.stdout.on('data', (chunk) => feed(String(chunk), 'stdout'));
    child.stderr.on('data', (chunk) => feed(String(chunk), 'stderr'));
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    let done = false;
    const settle = (result) => { if (done) return; done = true; clearTimeout(timer); clearInterval(heartbeat); resolve(result); };
    onChild?.({
      // What the room can do to a sign-in while it runs: answer it, or call it off.
      write: (text) => { try { child.stdin?.write(text); return true; } catch { return false; } },
      cancel: () => {
        try { child.kill('SIGTERM'); } catch { /* already gone */ }
        // A terminal UI can ignore a polite ask; it does not get to ignore the second one.
        const hard = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, 1500);
        hard.unref?.();
      },
      pid: child.pid ?? null,
    });
    child.on('error', (error) => settle({ code: 1, error: error.code === 'ENOENT' ? `${error.message} (is the project folder present and ${command} on PATH?)` : error.message }));
    child.on('close', (code) => {
      if (buffer.trim()) onLine?.(buffer.trim(), 'stdout');
      settle({ code: code ?? 1 });
    });
  });
}
