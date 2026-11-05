// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The only bridge from a human module to MADRE. The module's JavaScript runs in a fresh Node
// process with no inherited environment, no filesystem writes and no child processes.
import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forgetSecret, readSecret, summary as vaultSummary, writeSecret } from '../vault.mjs';
import { OutboundLog } from '../outbound.mjs';

const RUN_ALONE = fileURLToPath(new URL('./run-alone.mjs', import.meta.url));
const FETCH_ALONE = fileURLToPath(new URL('./fetch-alone.mjs', import.meta.url));
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
const PUBLIC_ROOT = join(PACKAGE_ROOT, 'public');
const PACKAGE_JSON = join(PACKAGE_ROOT, 'package.json');
export const FENCE = ['--permission', '--experimental-permission'].find((flag) => process.allowedNodeEnvironmentFlags.has(flag)) ?? null;
const NETWORK = process.allowedNodeEnvironmentFlags.has('--allow-net') ? '--allow-net' : null;
// The module's own time for one call. What it waits on MADRE for (a local model on a computer with no
// graphics card takes minutes, L-7) does not count against it; the ceiling holds both.
const LIMIT_MS = 30000;
const CEILING_MS = 15 * 60 * 1000;
const MAX_BYTES = 1 << 20;
const MAX_CONTEXT_CALLS = 256;

export const permissionArgs = (file, reaches = [], { sdk = true } = {}) => {
  if (!FENCE) throw new Error('This Node cannot isolate a module; update Node before loading it.');
  const readable = sdk ? [SOURCE_ROOT, PUBLIC_ROOT, PACKAGE_JSON, file] : [file];
  return [FENCE, ...readable.map((path) => `--allow-fs-read=${path}`), ...(NETWORK && reaches.length ? [NETWORK] : [])];
};
const send = (child, message) => {
  if (child.stdin.destroyed) return;
  try { child.stdin.write(`${JSON.stringify({ madreModule: true, ...message })}\n`); }
  catch { /* A finished child cannot receive another context answer. */ }
};

async function answerContext(id, ctx, method, args) {
  const services = ctx.services ?? {};
  switch (method) {
    case 'readConfig': return ctx.readConfig?.();
    case 'updateConfig': {
      const patch = args[0];
      const key = ctx.moduleConfigKey;
      if (!key || !patch || Object.keys(patch).join() !== 'modules' || Object.keys(patch.modules ?? {}).join() !== key) throw new Error('A module may change only its own settings.');
      return ctx.updateConfig?.(patch);
    }
    case 'record': return ctx.record?.(args[0], args[1]);
    case 'room.record': return ctx.record?.(args[0], args[1]);
    case 'vault.get': return readSecret(ctx.stateRoot, id, args[0]);
    case 'vault.held': return vaultSummary(ctx.stateRoot, id);
    case 'vault.keep': return writeSecret(ctx.stateRoot, id, args[0], args[1]);
    case 'vault.forget': return forgetSecret(ctx.stateRoot, id, args[0]);
    case 'services.history': return services.history?.(args[0]);
    case 'services.ollama.generate': return services.ollama?.generate?.(args[0]);
    case 'outbound.record': {
      const file = ctx.env?.PULSE_OUTBOUND_LOG;
      if (!file) return null;
      const log = new OutboundLog({ file });
      log.record(args[0] ?? {});
      await log.drain();
      return null;
    }
    default: throw new Error('This context method is not available to a human module.');
  }
}

export async function runExternal({ file, id, configKey, reaches = [], operation, index = null, ctx = {}, args = [], limitMs = LIMIT_MS, ceilingMs = CEILING_MS }) {
  const canonical = await realpath(file);
  const flags = permissionArgs(canonical, reaches);
  const room = ctx.room;
  const turnId = operation === 'toolsForTurn' ? args[0]?.turn : null;
  const input = {
    projectRoot: ctx.projectRoot, stateRoot: ctx.stateRoot, roomId: ctx.roomId, chat: ctx.chat,
    config: ctx.config ?? {}, settings: ctx.settings ?? {}, agents: ctx.agents ?? [], language: ctx.language ?? 'en',
    hasRoom: Boolean(room), capabilities: room?.capabilities?.() ?? null, turnId,
    runningTurn: turnId ? room?.runningTurn?.(turnId) ?? null : null,
    ollamaState: ctx.services?.ollama?.state?.() ?? null,
  };
  return new Promise((resolveDone, rejectDone) => {
    const child = spawn(process.execPath, [...flags, RUN_ALONE, canonical], { cwd: dirname(canonical), env: {}, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const context = { ...ctx, moduleConfigKey: configKey };
    let settled = false;
    let stdout = '';
    let bytes = 0;
    let contextCalls = 0;
    let timer = null;
    let spent = 0;
    let since = Date.now();
    let waiting = 0;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(ceiling);
      child.kill();
      if (error) rejectDone(error); else resolveDone(value);
    };
    const tooLong = () => finish(new Error(`Module ${id} did not answer in ${limitMs / 1000} s.`));
    const ceiling = setTimeout(() => finish(new Error(`Module ${id} did not answer in ${Math.round(ceilingMs / 60000)} min.`)), ceilingMs);
    timer = setTimeout(tooLong, limitMs);
    // While MADRE answers one of its calls, the module's clock stops.
    const pause = () => { if (waiting++ === 0) { spent += Date.now() - since; clearTimeout(timer); } };
    const resume = () => { if (--waiting === 0 && !settled) { since = Date.now(); timer = setTimeout(tooLong, Math.max(0, limitMs - spent)); } };
    child.on('error', (error) => finish(error));
    child.stdin.on('error', (error) => { if (!settled) finish(error); });
    child.on('close', (code) => {
      if (!settled) finish(new Error(`Module ${id} ended before answering (exit ${code}).`));
    });
    child.stderr.resume();
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) return finish(new Error(`Module ${id} answered with too much data.`));
      stdout += chunk;
      let end;
      while ((end = stdout.indexOf('\n')) >= 0) {
        const line = stdout.slice(0, end).trim();
        stdout = stdout.slice(end + 1);
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (!message?.madreModule) continue;
        if (message.type === 'done') return finish(message.ok ? null : Object.assign(new Error(message.error ?? 'Module failed.'), { code: message.code ?? undefined }), message.value);
        if (message.type !== 'ctx') continue;
        if (++contextCalls > MAX_CONTEXT_CALLS) return finish(new Error(`Module ${id} requested too many context calls.`));
        pause();
        void Promise.resolve().then(() => answerContext(id, context, message.method, message.args ?? []))
          .then((value) => send(child, { type: 'ctxResult', id: message.id, ok: true, value }),
            (error) => send(child, { type: 'ctxResult', id: message.id, ok: false, error: String(error?.message ?? error) }))
          .finally(resume);
      }
    });
    send(child, { type: 'invoke', expectedId: id, operation, index, ctx: input, args });
  });
}

// A module may hand a server to a turn, but it may not use that to regain the rights that its
// own process lacks. Only the same one-file Node server is accepted, under the same fence.
export async function fencedTools(servers, { file, id = '?', reaches = [], turn, outboundLog = null } = {}) {
  const canonical = await realpath(file);
  const flags = permissionArgs(canonical, reaches);
  const offered = [];
  for (const server of servers ?? []) {
    const script = server?.args?.[0];
    const same = script && await realpath(resolve(dirname(canonical), script)).then((path) => path === canonical).catch(() => false);
    if (!same || ![process.execPath, 'node'].includes(server.command)) {
      console.error(`MADRE module ${id}: an MCP server was withheld because it is not this module's own Node file.`);
      continue;
    }
    const scratchDir = Number(turn?.mode) >= 2 && turn?.scratchDir ? await realpath(turn.scratchDir) : null;
    const tracePath = outboundLog ? join(await realpath(dirname(outboundLog)), basename(outboundLog)) : null;
    const scratch = scratchDir ? [`--allow-fs-write=${scratchDir}`] : [];
    const trace = tracePath ? [`--allow-fs-write=${tracePath}`, '--import', FETCH_ALONE] : [];
    const env = { ...(server.env ?? {}) };
    // A tool may receive its own declared credentials, but it cannot smuggle extra Node flags
    // (including permission grants) through the environment of the process MADRE starts.
    delete env.NODE_OPTIONS;
    offered.push({ ...server, command: process.execPath, args: [...flags, ...scratch, ...trace, canonical, ...server.args.slice(1)], env: { ...env, ...(tracePath ? { PULSE_OUTBOUND_LOG: tracePath } : {}) } });
  }
  return offered;
}
