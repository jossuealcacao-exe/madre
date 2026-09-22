import { spawn } from 'node:child_process';
import { MODULES, moduleById, describeModules } from './modules/index.mjs';
export { gitToplevel, findOnPath } from './modules/helpers.mjs';

// Compatibility over the module registry (src/modules/): the same names the
// server and the tests have always used, now answered by one file per module.
export const EXTENSIONS = MODULES;
export const AHP = moduleById('ahp');
export const IMAGE_STUDIO = moduleById('image-studio');
export const GIT_PULSE = moduleById('git-pulse');
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
export function runInstaller({ command, args, projectRoot, onLine, timeoutMs = 600000, heartbeatMs = 8000, env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, env: { ...env, NO_COLOR: '1', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', windowsHide: true });
    const started = Date.now();
    let lastOutput = started;
    // Installers go quiet for long stretches (npm install, git status); say so.
    const heartbeat = setInterval(() => {
      if (Date.now() - lastOutput >= heartbeatMs) {
        onLine?.(`… still running · ${Math.round((Date.now() - started) / 1000)}s · installer is quiet (npm install or git status can take a while)`, 'heartbeat');
        lastOutput = Date.now();
      }
    }, Math.min(heartbeatMs, 2000));
    heartbeat.unref?.();
    let buffer = '';
    const feed = (chunk, stream) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line.trim()) { lastOutput = Date.now(); onLine?.(line, stream); }
      }
    };
    child.stdout.on('data', (chunk) => feed(String(chunk), 'stdout'));
    child.stderr.on('data', (chunk) => feed(String(chunk), 'stderr'));
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', (error) => { clearTimeout(timer); clearInterval(heartbeat); resolve({ code: 1, error: error.code === 'ENOENT' ? `${error.message} (is the project folder present and ${command} on PATH?)` : error.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      if (buffer.trim()) onLine?.(buffer.trim(), 'stdout');
      resolve({ code: code ?? 1 });
    });
  });
}
