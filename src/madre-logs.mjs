// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's error log, read for Home's widget (2026-11-05). ~/madre-logs keeps one file per
// error of MADRE, classified, with its state and its commit (its own AGENTS.md and indice.mjs say
// how); agents add and close them while they work. Home shows it as it moves: what is still to fix,
// what waits to be verified, and the last changes. It is read from this computer's disk and never
// leaves it: the folder holds clients' data. Only the author's copy run from source has it.

import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const logsFolder = (env = process.env) => env.MADRE_LOGS_DIR || join(homedir(), 'madre-logs');

const TO_FIX = ['en-curso', 'abierto', 'investigando', 'decision'];
const TO_VERIFY = ['arreglado', 'publicado'];
const LEVELS = ['P0', 'P1', 'P2', 'Investigar', 'Vigilar', 'Decisión'];

// The block between the first two «---» lines: one «key: value» per line, as PLANTILLA.md has it.
export function readFields(text) {
  const match = String(text ?? '').match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':');
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}

const quiet = (command, args) => new Promise((resolve) => {
  try { execFile(command, args, { timeout: 4000 }, (error, stdout) => resolve(error ? '' : String(stdout))); } catch { resolve(''); }
});

// What the widget draws. Null when there is no such folder: the widget is then not offered.
export async function readLogs({ dir = logsFolder(), run = quiet, now = Date.now() } = {}) {
  const names = await readdir(join(dir, 'errores')).catch(() => null);
  if (!names) return null;
  const errors = [];
  for (const name of names.filter((one) => one.endsWith('.md'))) {
    const file = join(dir, 'errores', name);
    const fields = readFields(await readFile(file, 'utf8').catch(() => ''));
    if (!fields?.id) continue;
    const changed = (await stat(file).catch(() => null))?.mtimeMs ?? null;
    errors.push({ id: fields.id, title: fields.titulo ?? '', clase: fields.clase ?? '', tipo: fields.tipo ?? '', nivel: fields.nivel ?? '', origen: fields.origen ?? '', estado: fields.estado ?? '', responsable: fields.responsable || null, commit: fields.commit || null, changed });
  }
  const byLevel = (a, b) => (LEVELS.indexOf(a.nivel) - LEVELS.indexOf(b.nivel)) || a.id.localeCompare(b.id, 'es', { numeric: true });
  const tally = (list, key) => Object.entries(list.reduce((all, one) => ({ ...all, [one[key]]: (all[one[key]] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
  const toFix = errors.filter((one) => TO_FIX.includes(one.estado)).sort(byLevel);
  const toVerify = errors.filter((one) => TO_VERIFY.includes(one.estado)).sort(byLevel);
  // The folder's own history: each change an agent saved, newest first.
  const log = (await run('git', ['-C', dir, 'log', '-n', '8', '--format=%h%x09%cI%x09%s']))
    .split('\n').filter(Boolean).map((line) => { const [hash, at, ...said] = line.split('\t'); return { hash, at, said: said.join('\t') }; });
  return {
    available: true,
    total: errors.length,
    counts: { toFix: toFix.length, toVerify: toVerify.length, verified: errors.filter((one) => one.estado === 'verificado').length, inProgress: errors.filter((one) => one.estado === 'en-curso').length },
    byClase: tally(toFix, 'clase'),
    byTipo: tally(toFix, 'tipo'),
    toFix,
    toVerify,
    recent: [...errors].filter((one) => one.changed).sort((a, b) => b.changed - a.changed).slice(0, 5).map(({ id, title, estado, changed }) => ({ id, title, estado, changed: new Date(changed).toISOString() })),
    log,
    at: new Date(now).toISOString(),
  };
}
