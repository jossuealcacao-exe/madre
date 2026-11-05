// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's error log, read for Home's widget (2026-11-05). ~/madre-logs keeps one file per
// error of MADRE, classified, with its state and its commit (its own AGENTS.md and indice.mjs say
// how); agents add and close them while they work. Home shows it as it moves: what is still to fix,
// what waits to be verified, and the last changes. It is read from this computer's disk and never
// leaves it: the folder holds clients' data. Only the author's copy run from source has it.

import { execFile } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CONDITIONS } from '../public/troubleshooting.js';
import { ES } from '../public/es.js';

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

// The three agents that build MADRE (2026-11-05): Claude, Codex and Antigravity. However a file or
// a row of EN-CURSO.md writes the name, it is one of these, or nobody MADRE knows.
export function agentOf(text) {
  const said = String(text ?? '');
  if (/anti-?\s?gravity|\bagy\b|gemini/i.test(said)) return 'antigravity';
  if (/codex/i.test(said)) return 'codex';
  if (/claude/i.test(said)) return 'claude';
  return null;
}
const ERROR_ID = /\b(?:D|S|MR|L|RX|Q|W|CI)-[A-Z0-9]+\b/g;

// Who is working on what now: the rows of EN-CURSO.md (madre-logs' rule 12), with the errors each one
// names. A row written in another shape is skipped, never guessed at.
export function readWorking(text) {
  const rows = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!/^\|/.test(line) || /^\|\s*-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 3 || !cells[0] || /^agente$/i.test(cells[0])) continue;
    const [who, what = '', zone = '', since = '', notes = ''] = cells;
    rows.push({ who, agent: agentOf(who), what, zone, since, notes, ids: [...new Set(`${what} ${notes}`.match(ERROR_ID) ?? [])] });
  }
  return rows;
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
  // An error is in progress when its file says so, or when a row of EN-CURSO.md names it: an agent
  // that registered its work and did not yet touch the error's state still shows who has it.
  const working = readWorking(await readFile(join(dir, 'EN-CURSO.md'), 'utf8').catch(() => ''));
  for (const one of errors) {
    const row = working.find((work) => work.ids.includes(one.id));
    one.agent = agentOf(one.responsable) ?? row?.agent ?? null;
    if (!one.responsable && row) one.responsable = row.who;
    if (row && (one.estado === 'abierto' || one.estado === 'investigando')) one.estado = 'en-curso';
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
    working,
    byClase: tally(toFix, 'clase'),
    byTipo: tally(toFix, 'tipo'),
    toFix,
    toVerify,
    recent: [...errors].filter((one) => one.changed).sort((a, b) => b.changed - a.changed).slice(0, 5).map(({ id, title, estado, changed }) => ({ id, title, estado, changed: new Date(changed).toISOString() })),
    log,
    at: new Date(now).toISOString(),
  };
}

// ---- The diagnostics, filed on their own (2026-11-05). Each group the copies report (madre.run's
// /api/telemetry, read with the author's token) becomes an error here the first time it is seen:
// D-n, with its fingerprint, a classification guessed from what kind of failure it is, and level
// «Investigar» until somebody looks at it. A group already filed only gets its copies brought up to
// date. Groups first seen before `desde` were filed by hand from the reading of 2026-11-03.

export const DIAGNOSTICS_SINCE = '2026-11-04T00:00:00.000Z';
const KIND_CLASS = {
  agent: ['Fallo', 'Agentes'], model: ['Fallo', 'IA local'], startup: ['Instalación', 'Servidor y arranque'],
  route: ['Fallo', 'Servidor y arranque'], crash: ['Fallo', 'Servidor y arranque'], page: ['Fallo', 'Conversación'], other: ['Fallo', 'Diagnóstico'],
};
export function guessClass(group) {
  if (group.kind === 'install') return ['Instalación', group.agent ? 'Agentes' : /ollama|modelo|model/i.test(group.message ?? '') ? 'IA local' : 'Módulos y Mercado'];
  return KIND_CLASS[group.kind] ?? KIND_CLASS.other;
}
const oneLine = (text, max = 110) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// A group with no words of its own (an MU code with an empty message) is named by its sheet, in Spanish.
const sheetTitle = (code) => { const sheet = code ? CONDITIONS.find((one) => one.code === code) : null; return sheet ? (ES[sheet.title] ?? sheet.title) : null; };

function entryFor(id, group) {
  const [clase, tipo] = guessClass(group);
  const day = (iso) => String(iso ?? '').slice(0, 10);
  const words = oneLine(group.message, 90) || sheetTitle(group.code) || group.kind;
  const what = `${group.code ? `${group.code} · ` : ''}${group.agent ? `@${group.agent} · ` : ''}${words}`;
  return [
    '---', `id: ${id}`, `titulo: ${oneLine(what, 120).replace(/\n/g, ' ')}`, `clase: ${clase}`, `tipo: ${tipo}`, 'nivel: Investigar', 'origen: Diagnóstico', 'estado: abierto',
    'responsable:', `copias: ${group.copies ?? ''}`, `version: ${(group.versions ?? []).join(', ')}`, `abierto: ${day(group.first_seen)}`, 'cerrado:', 'commit:', `fp: ${group.fp}`, '---', '',
    '## Qué pasa', '', `Dado de alta solo desde el diagnóstico de las copias; **la clase y el tipo son una suposición** por su clase de falla (\`${group.kind}\`): revisarlos al investigarlo.`, '',
    '```', String(group.message ?? '').slice(0, 1500), '```', '',
    '## Evidencia', '',
    `- Copias: ${group.copies ?? '?'} · veces: ${group.hits ?? '?'}`,
    `- Versiones: ${(group.versions ?? []).join(', ') || '?'} · sistemas: ${(group.systems ?? []).join(', ') || '?'}${group.wsl ? ' · WSL' : ''}`,
    `- Primera vez: ${group.first_seen ?? '?'} · última: ${group.last_seen ?? '?'}`,
    `- Huella: \`${group.fp}\`${group.code ? ` · ficha ${group.code}` : ''} · estado en madre.run: ${group.status ?? '?'}`, '',
    '## Causa', '', ...(group.frames?.length ? ['Líneas de MADRE por donde pasó:', '', '```', ...group.frames.slice(0, 12), '```'] : ['Pendiente.']), '',
    '## Arreglo', '', 'Pendiente.', '', '## Cómo verificar', '', 'Que el grupo no vuelva en la siguiente lectura del diagnóstico con la versión que lo arregle.', '',
  ].join('\n');
}

// Files the new groups and brings the copies of the filed ones up to date. Returns what changed.
export async function syncDiagnostics({ dir = logsFolder(), groups = [], since = DIAGNOSTICS_SINCE } = {}) {
  const folder = join(dir, 'errores');
  const names = await readdir(folder).catch(() => null);
  if (!names) return { added: [], updated: [] };
  const byFp = new Map();
  let last = 0;
  for (const name of names.filter((one) => one.endsWith('.md'))) {
    const text = await readFile(join(folder, name), 'utf8').catch(() => '');
    const fields = readFields(text);
    if (!fields?.id) continue;
    const number = /^D-(\d+)$/.exec(fields.id)?.[1];
    if (number) last = Math.max(last, Number(number));
    // One error may carry several groups: `fp: a1b2…, c3d4…`.
    const one = { name, text, fields };
    for (const fp of String(fields.fp ?? '').split(/[\s,]+/).filter(Boolean)) byFp.set(fp, one);
  }
  const added = [];
  const updated = [];
  // An error that carries several groups counts the copies of all of them.
  const copiesOf = new Map();
  for (const group of groups) {
    if (!/^[0-9a-f]{8,64}$/i.test(String(group?.fp ?? ''))) continue;
    const filed = byFp.get(group.fp);
    if (filed) {
      if (filed.text) copiesOf.set(filed, (copiesOf.get(filed) ?? 0) + (Number(group.copies) || 0));
      continue;
    }
    if (['ignored', 'fixed'].includes(group.status) || String(group.first_seen ?? '') < since) continue;
    last += 1;
    const id = `D-${last}`;
    await writeFile(join(folder, `${id}.md`), entryFor(id, group));
    byFp.set(group.fp, { name: `${id}.md`, text: '', fields: { id } });
    added.push(id);
  }
  for (const [filed, copies] of copiesOf) {
    if (!copies || filed.fields.copias === String(copies)) continue;
    await writeFile(join(folder, filed.name), filed.text.replace(/^copias:.*$/m, `copias: ${copies}`));
    updated.push(filed.fields.id);
  }
  return { added, updated };
}

// After a sync: INDICE.md written again and the change kept in the folder's own history.
export async function keepSync({ dir = logsFolder(), added = [], updated = [], run = quiet } = {}) {
  if (!added.length && !updated.length) return false;
  await run(process.execPath, [join(dir, 'indice.mjs')]);
  const said = [added.length ? `alta automática de ${added.join(', ')}` : null, updated.length ? `copias al día en ${updated.join(', ')}` : null].filter(Boolean).join('; ');
  await run('git', ['-C', dir, 'add', '-A']);
  await run('git', ['-C', dir, 'commit', '-q', '-m', `Diagnóstico: ${said}`]);
  return true;
}
