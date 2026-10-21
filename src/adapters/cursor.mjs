// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Cursor's agent CLI (`cursor-agent`, 2026.05), added 2026-10-17. It reads only: every turn runs in
// Cursor's own ask mode (`--mode ask`, «Q&A style, read-only») under a configuration made for the
// turn and removed after it (CURSOR_CONFIG_DIR), which denies every command and every write and
// keeps the sandbox off. Print mode alone would give it every tool, write and shell included, so
// neither is ever left out. Its sign-in lives in the system keychain, not in that folder, so the
// turn keeps the person's session and nothing else of their settings.
//
// Tried against the real CLI on 2026-10-17: it read and answered; asked to create a file and to run
// `touch`, it wrote nothing and said it was in Ask mode. `--sandbox enabled` was dropped: on a Mac
// where Cursor's sandbox is not available the run ends at once («Sandbox mode is enabled but not
// available on this system»).
//
// From 2026-10-21 it works at every mode, as the other agents do. #2 and #3 run in Cursor's agent
// mode with `--force` (in print mode, changes are only proposed without it), under a configuration
// that allows writing and denies every command and the places nobody writes; #4 allows commands
// too. Cursor's own rules are the first wall, not the only one: the room locks .env, .git and its
// own folders read-only for the turn and puts back whatever reaches them, and at #2 everything that
// existed before (room/control.mjs) — so a rule Cursor read differently could not cost a file. A
// command cannot be put back; that is why commands are denied below #4. Not yet run against a paid
// Cursor account (the author's is free and spent): built on Cursor's documented permissions and
// held by the room's own guard.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReadonlyProcess } from './process.mjs';

// What the turn's own configuration allows: reading, and nothing else.
export const READONLY_CONFIG = {
  version: 1,
  permissions: { allow: [], deny: ['Shell(*)', 'Write(**)'] },
  approvalMode: 'allowlist',
  sandbox: { mode: 'disabled' },
};

// The places no turn writes, whatever its mode (as OpenCode's FORBIDDEN_GLOBS). `.pulse` is left to
// the room when the turn has a draft folder there, because Cursor's denials win over its allowances
// and would shut that folder too; the room locks every other `.pulse` path itself.
const NEVER_WRITTEN = ['.git/**', '.madre/**', '.env', '.env.*', '**/.env', '**/.env.*', '.claude/settings.local.json'];
// One configuration per turn, from the lease the room gave it: none, read only.
export function cursorConfigFor(lease = null) {
  if (!lease) return READONLY_CONFIG;
  const everywhere = Boolean(lease.create || lease.control || lease.airlock);
  const dir = String(lease.relativeDir ?? '.').replace(/^\.\/+/, '').replace(/\/+$/, '');
  const writes = everywhere || !dir || dir === '.' ? ['Write(**)'] : [`Write(${dir}/**)`];
  const never = [...NEVER_WRITTEN, ...(lease.scratchDir ? [] : ['.pulse/**'])].map((glob) => `Write(${glob})`);
  return {
    version: 1,
    permissions: {
      allow: ['Read(**)', ...writes, ...(lease.airlock ? ['Shell(*)'] : [])],
      deny: [...(lease.airlock ? [] : ['Shell(*)']), ...never],
    },
    approvalMode: 'allowlist',
    sandbox: { mode: 'disabled' },
  };
}

export function buildCursorArgs({ projectRoot, prompt, model = process.env.PULSE_CURSOR_MODEL || null, lease = null }) {
  return [
    '--print',
    '--output-format', 'stream-json',
    // Reading: Cursor's own ask mode. Writing: its agent mode, with the changes applied (`--force`)
    // under the turn's configuration above.
    ...(lease ? ['--force'] : ['--mode', 'ask']),
    // A headless run cannot answer the «trust this folder?» question; the project is the human's.
    '--trust',
    '--workspace', projectRoot,
    ...(model && model !== 'auto' ? ['--model', model] : []),
    prompt,
  ];
}

export function cursorEnvironment(environment = process.env, { configDir = null } = {}) {
  // A turn never opens a browser: a sign-in is the room's to start, from Settings › Agents.
  return { ...environment, NO_OPEN_BROWSER: '1', ...(configDir ? { CURSOR_CONFIG_DIR: configDir } : {}) };
}

// `--output-format stream-json` writes one JSON object per line and closes with a `result` line
// that carries the whole answer and, when the CLI has it, the turn's tokens. The assistant lines
// before it are the same text in pieces: read when the result never came (the run was cut short).
export function parseCursorOutput(output) {
  const pieces = [];
  let result = null;
  let usage = null;
  let error = null;
  for (const line of String(output ?? '').split('\n').filter(Boolean)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.type === 'assistant') {
      for (const part of event.message?.content ?? []) if (part?.type === 'text' && typeof part.text === 'string') pieces.push(part.text);
    }
    if (event?.type === 'result') {
      if (event.is_error) error = typeof event.result === 'string' && event.result.trim() ? event.result.trim() : 'Cursor returned an error.';
      else if (typeof event.result === 'string') result = event.result;
      const tokens = event.usage;
      if (tokens && typeof tokens === 'object') {
        const input = Number(tokens.inputTokens ?? tokens.input_tokens ?? 0);
        const output = Number(tokens.outputTokens ?? tokens.output_tokens ?? 0);
        const cached = Number(tokens.cacheReadTokens ?? tokens.cache_read_tokens ?? 0);
        usage = { inputTokens: input, cachedInputTokens: cached, outputTokens: output, reasoningTokens: 0, totalTokens: input + output, costUsd: null, source: 'cursor-json' };
      }
    }
    if (event?.type === 'error' && !error) error = String(event.error?.message ?? event.message ?? 'Cursor returned an error.');
  }
  // A run that ended in an error answers nothing, so the room reports the error, not a fragment.
  const text = error ? '' : (result ?? pieces.join('')).trim();
  return { text, usage, ...(error ? { error } : {}) };
}

// A free plan answers only with Auto (2026-10-21): any named model is refused with «Named models
// unavailable · Free plans can only use Auto». The turn is asked again with Auto, and from then on
// this room offers Auto alone (models.mjs) — nothing says the plan before a turn does.
export const ONLY_AUTO = /Free plans can only use Auto|Named models unavailable/i;
let onlyAuto = false;
export const cursorOnlyAuto = () => onlyAuto;

export async function invokeCursor({ executable, projectRoot, prompt, timeoutMs = 120000, signal, model = null, lease = null, onProgress = null }) {
  const configDir = await mkdtemp(join(tmpdir(), 'madre-cursor-'));
  try {
    await writeFile(join(configDir, 'cli-config.json'), `${JSON.stringify(cursorConfigFor(lease), null, 2)}\n`);
    const run = (named) => runReadonlyProcess({
      onProgress: onProgress ? (out) => onProgress({ chars: out.length }) : null,
      executable,
      args: buildCursorArgs({ projectRoot, prompt, lease, ...(named ? { model: named } : {}) }),
      cwd: projectRoot,
      env: cursorEnvironment(process.env, { configDir }),
      timeoutMs,
      signal,
      label: 'Cursor',
      parse: parseCursorOutput,
    });
    const named = onlyAuto ? null : model;
    try {
      return await run(named);
    } catch (error) {
      if (!named || named === 'auto' || !ONLY_AUTO.test(String(error?.message ?? ''))) throw error;
      onlyAuto = true;
      return await run(null);
    }
  } finally {
    // The chats and caches the CLI wrote there go with it: a turn keeps no session of its own.
    await rm(configDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }).catch(() => {});
  }
}
