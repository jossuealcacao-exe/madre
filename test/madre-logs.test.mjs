import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFields, readLogs } from '../src/madre-logs.mjs';

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
  assert.match(server, /if \(kind === 'madrelogs'\) return FROM_SOURCE && salasRoom \? readLogs\(\) : null;/);
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /'w-madrelogs': \{ kind: 'madrelogs', owner: true, every: 5000,/);
});
