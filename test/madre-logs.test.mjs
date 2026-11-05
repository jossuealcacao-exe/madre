import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DIAGNOSTICS_SINCE, guessClass, keepSync, readFields, readLogs, syncDiagnostics } from '../src/madre-logs.mjs';

const entry = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n\n## Qué pasa\n\nalgo\n`;

// 2026-11-05: the author's error log on Home, as agents add and close errors in ~/madre-logs.
test('madre-logs · Home reads what is to fix, what waits to be verified and the last changes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-logs-'));
  try {
    assert.equal(await readLogs({ dir }), null, 'no folder, no widget');
    await mkdir(join(dir, 'errores'));
    const base = { clase: 'Fallo', tipo: 'Memoria', origen: 'Cliente piloto', abierto: '2026-11-05' };
    await writeFile(join(dir, 'errores', 'L-9.md'), entry({ id: 'L-9', titulo: 'Resumen sin sesión', nivel: 'P1', estado: 'en-curso', responsable: 'claude', ...base }));
    await writeFile(join(dir, 'errores', 'L-10.md'), entry({ id: 'L-10', titulo: 'Memoria de Inicio', nivel: 'Investigar', estado: 'investigando', ...base, tipo: 'Inicio' }));
    await writeFile(join(dir, 'errores', 'RX-2.md'), entry({ id: 'RX-2', titulo: 'Módulos', nivel: 'P2', estado: 'abierto', ...base, clase: 'Seguridad' }));
    await writeFile(join(dir, 'errores', 'L-7.md'), entry({ id: 'L-7', titulo: 'Coordinador', nivel: 'P1', estado: 'arreglado', commit: '47f7f52', ...base }));
    await writeFile(join(dir, 'errores', 'D-1.md'), entry({ id: 'D-1', titulo: 'Codex', nivel: 'P1', estado: 'verificado', commit: 'e54205a', ...base }));
    await writeFile(join(dir, 'errores', 'roto.md'), 'sin bloque');
    const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, stdio: 'ignore' });
    git('init', '-q'); git('add', '.'); git('commit', '-qm', 'L-9: en curso');
    const reading = await readLogs({ dir });
    assert.deepEqual(reading.counts, { toFix: 3, toVerify: 1, verified: 1, inProgress: 1 });
    assert.equal(reading.total, 5, 'a file without its block is not counted');
    assert.deepEqual(reading.toFix.map((one) => one.id), ['L-9', 'RX-2', 'L-10'], 'by level, P1 first');
    assert.equal(reading.toFix[0].responsable, 'claude');
    assert.deepEqual(reading.byClase, [{ name: 'Fallo', n: 2 }, { name: 'Seguridad', n: 1 }]);
    assert.deepEqual(reading.toVerify.map((one) => [one.id, one.commit]), [['L-7', '47f7f52']]);
    assert.equal(reading.log[0].said, 'L-9: en curso');
    assert.equal(readFields('---\nid: X-1\ntitulo: a: b\n---\n').titulo, 'a: b');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  // Home serves it only in the author's copy run from source, every few seconds, never to a phone.
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(kind === 'madrelogs'\) \{\n\s*if \(!FROM_SOURCE \|\| !salasRoom\) return null;[\s\S]{0,1200}return readLogs\(\);/);
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /'w-madrelogs': \{ kind: 'madrelogs', owner: true, every: 5000,/);
});

// 2026-11-05: what the copies report is filed on its own, without waiting for somebody to read it.
test('madre-logs · each new group of the diagnostics is filed once, classified as a guess, and the filed ones keep their copies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-logs-sync-'));
  try {
    await mkdir(join(dir, 'errores'));
    const base = { clase: 'Fallo', tipo: 'Agentes', nivel: 'P1', origen: 'Diagnóstico', estado: 'arreglado', abierto: '2026-11-03', commit: 'e54205a' };
    await writeFile(join(dir, 'errores', 'D-1.md'), entry({ id: 'D-1', titulo: 'Codex', copias: '6', fp: 'aaaaaaaaaaaaaaaa', ...base }));
    await writeFile(join(dir, 'errores', 'D-2.md'), entry({ id: 'D-2', titulo: 'Ollama', copias: '1', fp: 'bbbbbbbbbbbbbbbb, cccccccccccccccc', ...base }));
    const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, stdio: 'ignore' });
    git('init', '-q'); git('add', '.'); git('commit', '-qm', 'inicio');
    const after = '2026-11-04T20:45:32.364Z';
    const groups = [
      { fp: 'aaaaaaaaaaaaaaaa', kind: 'agent', copies: 7, first_seen: '2026-10-30T00:00:00Z', status: 'new' },
      { fp: 'bbbbbbbbbbbbbbbb', kind: 'model', copies: 2, first_seen: '2026-10-30T00:00:00Z', status: 'new' },
      { fp: 'cccccccccccccccc', kind: 'install', copies: 3, first_seen: '2026-10-30T00:00:00Z', status: 'new' },
      { fp: '50bde83e78e727c4', kind: 'agent', code: 'MU-014', agent: 'opencode', message: '', copies: 1, hits: 2, versions: ['1.1.2'], systems: ['linux'], frames: ['src/adapters/opencode.mjs:120'], first_seen: after, last_seen: after, status: 'new' },
      { fp: 'dddddddddddddddd', kind: 'install', message: 'install failed · ahp', copies: 2, first_seen: after, status: 'new' },
      { fp: 'eeeeeeeeeeeeeeee', kind: 'crash', message: 'viejo', copies: 9, first_seen: '2026-10-20T00:00:00Z', status: 'new' },
      { fp: 'ffffffffffffffff', kind: 'crash', message: 'ignorado', copies: 9, first_seen: after, status: 'ignored' },
      { fp: 'no es huella', kind: 'crash', message: 'x', first_seen: after },
    ];
    const first = await syncDiagnostics({ dir, groups });
    assert.deepEqual(first.added, ['D-3', 'D-4'], 'only the new groups since the day the log began, never ignored ones');
    assert.deepEqual(first.updated.sort(), ['D-1', 'D-2']);
    const d2 = await readFile(join(dir, 'errores', 'D-2.md'), 'utf8');
    assert.match(d2, /^copias: 5$/m, 'an error with two groups counts both');
    const d3 = readFields(await readFile(join(dir, 'errores', 'D-3.md'), 'utf8'));
    assert.deepEqual([d3.nivel, d3.origen, d3.estado, d3.clase, d3.tipo, d3.fp, d3.copias, d3.abierto], ['Investigar', 'Diagnóstico', 'abierto', 'Fallo', 'Agentes', '50bde83e78e727c4', '1', '2026-11-04']);
    assert.match(d3.titulo, /^MU-014 · @opencode · \S/, 'a group with no words is named by its sheet');
    assert.deepEqual(guessClass({ kind: 'install', message: 'install failed · ahp' }), ['Instalación', 'Módulos y Mercado']);
    // Read again: nothing new, nothing written.
    assert.deepEqual(await syncDiagnostics({ dir, groups }), { added: [], updated: [] });
    // Kept in the folder's own history.
    assert.equal(await keepSync({ dir, ...first }), true);
    assert.match(execFileSync('git', ['log', '-1', '--format=%s'], { cwd: dir, encoding: 'utf8' }), /^Diagnóstico: alta automática de D-3, D-4; copias al día en D-1, D-2/);
    assert.equal(DIAGNOSTICS_SINCE, '2026-11-04T00:00:00.000Z');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(Date\.now\(\) - logsSyncedAt > 600000\) \{[\s\S]{0,900}await keepSync\(await syncDiagnostics\(\{ groups: body\.errors \}\)\);/);
});

// 2026-11-05: Claude, Codex and Antigravity build MADRE at once. Whoever registers its work in
// EN-CURSO.md shows as working, with its badge, even before it touches the error's state.
test('madre-logs · who is working now, from EN-CURSO.md and from each error, with the three agents named', async () => {
  const { agentOf, readWorking } = await import('../src/madre-logs.mjs');
  for (const [said, agent] of [['antigravity · 2026-11-05', 'antigravity'], ['Anti-gravity', 'antigravity'], ['agy', 'antigravity'], ['codex · 2026-11-04', 'codex'], ['claude · sesión 2026-11-05', 'claude'], ['Ana', null]]) assert.equal(agentOf(said), agent, said);
  const table = '| Agente | Qué hace | Zona (archivos o carpetas) | Desde | Notas |\n|---|---|---|---|---|\n| antigravity · 2026-11-05 | Investigar D-3 y D-6 | src/modules/ollama.mjs | 2026-11-05 | |\n| codex · 2026-11-04 | Corregir RX-2 | src/modules/index.mjs | 2026-11-04 | RX-3 cerró y liberó app.js |\n';
  assert.deepEqual(readWorking(table).map((one) => [one.agent, one.ids]), [['antigravity', ['D-3', 'D-6']], ['codex', ['RX-2']]]);
  const dir = await mkdtemp(join(tmpdir(), 'madre-logs-working-'));
  try {
    await mkdir(join(dir, 'errores'));
    const base = { clase: 'Instalación', tipo: 'WSL y Linux', nivel: 'Investigar', origen: 'Diagnóstico', abierto: '2026-11-03' };
    await writeFile(join(dir, 'errores', 'D-3.md'), entry({ id: 'D-3', titulo: 'WSL sin DNS', estado: 'investigando', ...base }));
    await writeFile(join(dir, 'errores', 'RX-2.md'), entry({ id: 'RX-2', titulo: 'Módulos', estado: 'en-curso', responsable: 'codex · 2026-11-04', ...base, nivel: 'P2' }));
    await writeFile(join(dir, 'errores', 'Q-9.md'), entry({ id: 'Q-9', titulo: 'Nadie lo tiene', estado: 'abierto', ...base, nivel: 'P2' }));
    await writeFile(join(dir, 'EN-CURSO.md'), table);
    const reading = await readLogs({ dir, run: async () => '' });
    const byId = Object.fromEntries(reading.toFix.map((one) => [one.id, one]));
    assert.deepEqual([byId['D-3'].estado, byId['D-3'].agent, byId['D-3'].responsable], ['en-curso', 'antigravity', 'antigravity · 2026-11-05'], 'Antigravity registered D-3 and it did not show as in progress');
    assert.deepEqual([byId['RX-2'].estado, byId['RX-2'].agent], ['en-curso', 'codex']);
    assert.deepEqual([byId['Q-9'].estado, byId['Q-9'].agent], ['abierto', null]);
    assert.equal(reading.counts.inProgress, 2);
    assert.deepEqual(reading.working.map((one) => one.agent), ['antigravity', 'codex']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /const AGENTS = \{ claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity' \};/);
  assert.match(page, /if \(one\.estado === 'en-curso' && \(one\.agent \|\| one\.responsable\)\) top\.append\(badge\(one\.agent, one\.responsable\)\);/);
});
