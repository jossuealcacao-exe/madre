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
    // The folder's own index writer, reduced to what changes: how many errors there are.
    await writeFile(join(dir, 'indice.mjs'), "import { readdirSync, writeFileSync } from 'node:fs';\nwriteFileSync(new URL('./INDICE.md', import.meta.url), `${readdirSync(new URL('./errores', import.meta.url)).length} errores\\n`);\n");
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

    // Another agent at work in the folder (rules 16 and 18): its unsaved row and its unsaved error
    // stay out of the automatic commit, and its error's copies wait until it has saved.
    await writeFile(join(dir, 'EN-CURSO.md'), '| Agente | Qué hace |\n|---|---|\n| codex · 2026-11-05 | D-1 |\n');
    git('add', 'EN-CURSO.md');
    const d1 = await readFile(join(dir, 'errores', 'D-1.md'), 'utf8');
    await writeFile(join(dir, 'errores', 'D-1.md'), `${d1}\n## Causa\n\nLo que codex encontró.\n`);
    // And a D-5 it is filing by hand, not yet with its fields: the next number is taken instead.
    await writeFile(join(dir, 'errores', 'D-5.md'), 'a medio escribir');
    const later = groups.map((one) => (one.fp === 'aaaaaaaaaaaaaaaa' ? { ...one, copies: 9 } : one));
    later.push({ fp: '1234567812345678', kind: 'crash', message: 'nuevo', copies: 1, first_seen: after, status: 'new' });
    const second = await syncDiagnostics({ dir, groups: later });
    assert.deepEqual(second, { added: ['D-6'], updated: [] }, 'an unsaved error was written over, or a D-n in progress');
    assert.equal(await readFile(join(dir, 'errores', 'D-5.md'), 'utf8'), 'a medio escribir');
    assert.equal(await keepSync({ dir, ...second }), true);
    const kept = execFileSync('git', ['show', '--name-only', '--format=', 'HEAD'], { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean).sort();
    assert.deepEqual(kept, ['INDICE.md', 'errores/D-6.md'], 'the automatic commit took more, or less, than what it wrote');
    assert.match(execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }), /^A  EN-CURSO\.md$[\s\S]* M errores\/D-1\.md$/m, 'the other agent\'s work did not stay as it was');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(Date\.now\(\) - logsSyncedAt > 600000\) \{[\s\S]{0,400}await errorsReading\(\);[\s\S]{0,200}await keepSync\(await syncDiagnostics\(\{ groups: reading\.errors \}\)\);/);
  // One reading of madre.run's /api/telemetry for the errors widget and the filing, not one each.
  assert.equal(server.match(/api\/telemetry', \{ headers:/g)?.length, 1, 'madre.run\'s telemetry is read from more than one place');
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

// 2026-11-08: planned work the author already asked for is not a failure, and no level said that
// without lying. «Obra» sits last of all, the widget draws it (a level with no group of its own is
// drawn nowhere), the H- prefix of the Habilidades plan links its rows, and a row that names itself
// «claude-personal» keeps that name: the author works with two Claude accounts.
test('madre-logs · planned work («Obra») is read, sorted last and drawn, and a row keeps its own name', async () => {
  const { readWorking } = await import('../src/madre-logs.mjs');
  const table = '| Agente | Qué hace | Zona | Desde | Notas |\n|---|---|---|---|---|\n| claude-personal | Escribir H-1 de Habilidades | src/skills.mjs | 2026-11-08 | |\n';
  assert.deepEqual(readWorking(table).map((one) => [one.who, one.agent, one.ids]), [['claude-personal', 'claude', ['H-1']]], 'the H- prefix of a plan is an id the widget knows');
  const dir = await mkdtemp(join(tmpdir(), 'madre-logs-obra-'));
  try {
    await mkdir(join(dir, 'errores'));
    const base = { clase: 'Petición', tipo: 'Módulos y Mercado', origen: 'Plan', abierto: '2026-11-08' };
    await writeFile(join(dir, 'errores', 'H-1.md'), entry({ id: 'H-1', titulo: 'La habilidad en MADRE', nivel: 'Obra', estado: 'abierto', ...base }));
    await writeFile(join(dir, 'errores', 'H-2.md'), entry({ id: 'H-2', titulo: 'El bloque del prompt', nivel: 'Obra', estado: 'abierto', ...base }));
    await writeFile(join(dir, 'errores', 'D-9.md'), entry({ id: 'D-9', titulo: 'Algo roto', nivel: 'P2', estado: 'abierto', ...base, clase: 'Fallo', origen: 'Diagnóstico' }));
    await writeFile(join(dir, 'EN-CURSO.md'), table);
    const reading = await readLogs({ dir, run: async () => '' });
    assert.deepEqual(reading.toFix.map((one) => one.id), ['D-9', 'H-1', 'H-2'], 'planned work never looks more pressing than a failure');
    assert.equal(reading.toFix.find((one) => one.id === 'H-1').estado, 'en-curso', 'the EN-CURSO row says who has H-1');
    assert.equal(reading.toFix.find((one) => one.id === 'H-1').responsable, 'claude-personal');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  // A level the page has no group for is drawn nowhere, so the group and its words travel together.
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /\[t\('Planned work'\), \(one\) => one\.nivel === 'Obra', 'lv-work'\]/);
  assert.match(page, /one\.nivel === 'Obra' \? t\('Build'\)/);
  assert.match(await readFile(new URL('../public/salas-mac.css', import.meta.url), 'utf8'), /\.lv-work \{/);
  const es = await readFile(new URL('../public/es.js', import.meta.url), 'utf8');
  for (const word of ["'Planned work':", "'Build':"]) assert.ok(es.includes(word), `${word} is not translated`);
});

// 2026-11-05: Antigravity worked on RX-C1 without its row in EN-CURSO.md, and the widget had no way
// to say so. Each agent's own sessions say when it last wrote; one at work without a row is shown.
test('madre-logs · an agent at work without registering is shown, from the times of its own sessions', async () => {
  const { agentActivity } = await import('../src/madre-logs.mjs');
  const { utimes } = await import('node:fs/promises');
  const home = await mkdtemp(join(tmpdir(), 'madre-logs-home-'));
  try {
    const root = '/Users/autor/pulse';
    const now = Date.parse('2026-11-05T03:20:00Z');
    const day = new Date(now);
    const put = async (file, text, at) => { await mkdir(join(file, '..'), { recursive: true }); await writeFile(file, text); await utimes(file, at / 1000, at / 1000); };
    await put(join(home, '.claude', 'projects', '-Users-autor-pulse', 'a.jsonl'), '{}\n', now - 60000);
    await put(join(home, '.claude', 'projects', '-Users-autor-otro', 'b.jsonl'), '{}\n', now - 1000);
    // ~/pulse-qa is another project, though its folder starts like this one's.
    await put(join(home, '.claude', 'projects', '-Users-autor-pulse-qa', 'c.jsonl'), '{}\n', now - 500);
    const sessions = join(home, '.codex', 'sessions', String(day.getFullYear()), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0'));
    await put(join(sessions, 'rollout-otro.jsonl'), `${JSON.stringify({ type: 'session_meta', payload: { cwd: '/Users/autor/otro' } })}\n`, now - 1000);
    await put(join(sessions, 'rollout-madre.jsonl'), `${JSON.stringify({ type: 'session_meta', payload: { cwd: `${root}/src` } })}\n{}\n`, now - 120000);
    await put(join(home, '.gemini', 'antigravity', 'conversations', 'x.db-wal'), 'x', now - 30000);
    const active = await agentActivity({ home, roots: [root], now });
    assert.equal(active.claude, now - 60000, 'Claude in another project counted, or this one not');
    assert.equal(active.codex, now - 120000, 'Codex in another folder counted, or this one not');
    assert.equal(active.antigravity, now - 30000);
    // A worktree inside the project is the project.
    await put(join(home, '.claude', 'projects', '-Users-autor-pulse--claude-worktrees-arreglo', 'd.jsonl'), '{}\n', now - 20000);
    assert.equal((await agentActivity({ home, roots: [root], now })).claude, now - 20000, 'a worktree of the project did not count');
    const quiet = await agentActivity({ home, roots: [root], now: now + 3600000 });
    assert.deepEqual(quiet, { claude: null, codex: null, antigravity: null }, 'an hour later nobody is at work');

    // In the widget: only the ones with no row and no error of theirs in progress.
    const dir = await mkdtemp(join(tmpdir(), 'madre-logs-loose-'));
    try {
      await mkdir(join(dir, 'errores'));
      await writeFile(join(dir, 'errores', 'RX-2.md'), entry({ id: 'RX-2', titulo: 'Módulos', clase: 'Seguridad', tipo: 'Módulos y Mercado', nivel: 'P2', origen: 'Revisión externa', estado: 'en-curso', responsable: 'codex · 2026-11-04', abierto: '2026-11-03' }));
      await writeFile(join(dir, 'EN-CURSO.md'), '| Agente | Qué hace | Zona | Desde | Notas |\n|---|---|---|---|---|\n| claude · 2026-11-05 | Widget | src/madre-logs.mjs | 2026-11-05 | |\n');
      const reading = await readLogs({ dir, run: async () => '', activity: async () => active });
      assert.deepEqual(reading.unregistered.map((one) => one.agent), ['antigravity']);
      assert.equal(reading.unregistered[0].at, new Date(now - 30000).toISOString());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } finally {
    await rm(home, { recursive: true, force: true });
  }
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /for \(const one of loose\) \{[\s\S]{0,300}t\('Working without registering in EN-CURSO\.md'\)/);
});

// 2026-11-05: an agent that had just closed its error and taken its row out still showed as
// «working without registering» while its session wrote its last commit and its answer.
test('madre-logs · an agent that took its row out in these last minutes shows as finished, not as unregistered', async () => {
  const { readFinished } = await import('../src/madre-logs.mjs');
  const log = [
    '@@@ 2026-11-05T04:31:27Z', '-| claude · 2026-11-05 | Corregir Q-5 | src/files.mjs | 2026-11-05 | |',
    '@@@ 2026-11-05T04:28:00Z', '-| codex · 2026-11-04 | Corregir RX-2 | src/x.mjs | 2026-11-04 | |', '+| codex · 2026-11-04 | Corregir RX-2 | src/x.mjs, src/y.mjs | 2026-11-04 | |',
    '@@@ 2026-11-05T04:24:29Z', '-| antigravity · 2026-11-04 | Corregir RX-C1 | src/server.mjs | 2026-11-04 | |',
  ].join('\n');
  assert.deepEqual(readFinished(log), { claude: '2026-11-05T04:31:27Z', antigravity: '2026-11-05T04:24:29Z' }, 'a row changed in place counted as a finish');
  const dir = await mkdtemp(join(tmpdir(), 'madre-logs-done-'));
  try {
    await mkdir(join(dir, 'errores'));
    await writeFile(join(dir, 'EN-CURSO.md'), '| Agente | Qué hace | Zona | Desde | Notas |\n|---|---|---|---|---|\n');
    const now = Date.parse('2026-11-05T04:33:00Z');
    const reading = await readLogs({ dir, now, run: async (command, args) => (args.includes('log') && args.includes('-p') ? log : ''), activity: async () => ({ claude: now - 10000, codex: now - 20000, antigravity: now - 360000 }) });
    const byAgent = Object.fromEntries(reading.unregistered.map((one) => [one.agent, one]));
    assert.equal(byAgent.claude.finished, '2026-11-05T04:31:27.000Z');
    assert.equal(byAgent.antigravity.finished, '2026-11-05T04:24:29.000Z');
    assert.equal(byAgent.codex.finished, undefined, 'codex only changed its row: it is still unregistered work');
    // Measured against its last activity, not against now: closed at 04:24, wrote at 04:25, read at
    // 04:34 — still the tail of that work. Writing again 25 minutes after it closed is new work.
    const later = Date.parse('2026-11-05T04:34:55Z');
    const tail = await readLogs({ dir, now: later, run: async (command, args) => (args.includes('log') && args.includes('-p') ? log : ''), activity: async () => ({ antigravity: Date.parse('2026-11-05T04:25:39Z') }) });
    assert.equal(tail.unregistered[0].finished, '2026-11-05T04:24:29.000Z', 'the tail of a finished work showed as unregistered');
    const fresh = await readLogs({ dir, now: later + 600000, run: async (command, args) => (args.includes('log') && args.includes('-p') ? log : ''), activity: async () => ({ antigravity: Date.parse('2026-11-05T04:49:30Z') }) });
    assert.equal(fresh.unregistered[0].finished, undefined, 'new work long after the finish was taken for the finish');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const page = await readFile(new URL('../public/salas-mac.js', import.meta.url), 'utf8');
  assert.match(page, /one\.finished \? t\('Finished its work'\) : t\('Working without registering in EN-CURSO\.md'\)/);
});
