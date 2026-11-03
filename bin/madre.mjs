#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE

import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { openUrl, startPulse } from '../src/server.mjs';
import { realpath } from 'node:fs/promises';
import { detectAgents } from '../src/runtime-detection.mjs';
import { probeAll } from '../src/auth-probe.mjs';
import { applyConfigToEnv, loadConfig } from '../src/config.mjs';
import { isOnline, runSetup } from '../src/setup.mjs';
import { parseArgs } from '../src/cli-args.mjs';
import { ensureSalasProject, isSalasRoom, projectRootFor } from '../src/salas.mjs';
import { forgetNpxLaunch } from '../src/npm-launch.mjs';
import { fichaHeaders, readFicha, withFicha } from '../src/ficha.mjs';
import { createServer } from 'node:net';

// Before anything is run: what npx left about the call that started MADRE is not passed on to the
// installers, agents and commands MADRE starts (src/npm-launch.mjs).
forgetNpxLaunch(process.env);

const cli = parseArgs(process.argv.slice(2));
const { command } = cli;

// WINDOWS (1.1.0, docs/WINDOWS.md D-001): on Windows, MADRE runs inside WSL2, not on Windows itself —
// what it promises about permissions (the write bit, process groups, each agent's sandbox) does not
// exist there the same way, and a start halfway is worse than none. A native start points at the
// installer (1.1.1, WIN-033: one file, a double click, no terminal), keeps the terminal way below it
// for whoever prefers it, in the person's language, and stops. PULSE_WINDOWS_NATIVE=1 lets a
// developer go on anyway.
if (process.platform === 'win32' && process.env.PULSE_WINDOWS_NATIVE !== '1' && command !== 'help') {
  const spanish = /^es\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale ?? '');
  console.log(spanish ? `
MADRE en Windows se instala con su instalador: descárgalo y ábrelo con doble clic.

  https://madre.run/windows

Hace todo solo: enciende WSL (el Linux que viene con Windows), prepara el Linux de MADRE
y deja «MADRE» en el menú Inicio. Sin terminal.

¿Prefieres la terminal? Dentro de Ubuntu (WSL2):
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs zstd
  npx @jossuealcala/madre
` : `
On Windows, MADRE installs with its installer: download it and open it with a double click.

  https://madre.run/en/windows

It does everything by itself: turns on WSL (the Linux that comes with Windows), prepares
MADRE's Linux and leaves «MADRE» in the Start menu. No terminal.

Prefer the terminal? Inside Ubuntu (WSL2):
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs zstd
  npx @jossuealcala/madre
`);
  process.exit(1);
}
const option = (name, fallback) => cli.option(name.replace(/^--/, ''), fallback);

// Is a MADRE already serving this very project nearby? `start` walks ports, so look along the
// same short stretch and compare the project each one reports.
async function roomAlreadyOpen(port, projectRoot, span = 8) {
  const mine = await realpath(projectRoot).catch(() => resolve(projectRoot));
  for (let candidate = port; candidate < port + span; candidate += 1) {
    try {
      // With the ficha (src/ficha.mjs): without it a MADRE says only that it is one, not which project.
      const response = await fetch(`http://127.0.0.1:${candidate}/api/version`, { headers: await fichaHeaders(), signal: AbortSignal.timeout(500) });
      if (!response.ok) continue;
      const info = await response.json();
      const theirs = info?.project ? await realpath(info.project).catch(() => info.project) : null;
      if (theirs && theirs === mine) return { url: `http://127.0.0.1:${candidate}`, version: info.current ?? null };
    } catch {
      // nothing listening there, or not a MADRE: keep looking.
    }
  }
  return null;
}


const has = (name) => cli.has(name.replace(/^--/, ''));

// Is somebody already on that port? Asked before anything is started, because opening a room
// means finding the agents, opening the archive and waking the memory, and doing all of that only
// to then refuse is a wait nobody needed. The real bind below stays the authority: this only
// saves the waiting.
// What `madre --help` says, in the language MADRE speaks (src/i18n.mjs).
const HELP_TEXT = `MADRE

  madre       [--port 4317] [--no-open]
              Opens Home: every project on this computer, in one place.
  madre start [--project PATH] [--port 4317] [--no-open] [--setup]
              Opens the project in this folder (or PATH) directly.
              Without --port, a busy 4317 falls through to the next free port.
  madre lobby [--port 4317] [--no-open]   (also: madre salas; opens Home)
  madre setup [--project PATH] [--port 4317] [--no-open]
  madre doctor [--project PATH] [--json]
  madre check-module --file <module.mjs> [--entry <entrada.json>] [--json] [--lang es]

  (none)  Opens Home. From there you add projects, connect the agents
          and enter any project. The Coordinator lives there.
  start   Opens the project in this folder. From your home folder, Home.
  setup   Detects the agents on this computer, shows who has a session,
          and runs each agent's own sign-in from here.
  doctor  Prints the same diagnosis without the wizard.
`;

// Where a room without --port starts looking (QA 1.1.0, GEN-02): 4317, or PULSE_PORT_BASE for the
// test suite and for whoever keeps another program on 4317.
const DEFAULT_PORT = /^\d{2,5}$/.test(String(process.env.PULSE_PORT_BASE ?? '')) ? String(process.env.PULSE_PORT_BASE) : '4317';

function portTaken(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', (error) => resolve(error.code === 'EADDRINUSE'));
    probe.listen(port, host, () => probe.close(() => resolve(false)));
  });
}

// With an explicit --port a busy port is an error the user asked for. Without
// one, MOTHER walks up to the next free port so a second room just opens.
async function openRoom(options) {
  const explicit = cli.explicit('port');
  let port = options.port;
  if (explicit && await portTaken(port)) {
    console.error(`\n  MADRE › port ${port} is already in use. Another MADRE may be open there; try --port ${port + 1} or omit --port to pick one automatically.\n`);
    process.exit(2);
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await startPulse({ ...options, port });
    } catch (error) {
      // The room itself says it is taken, whatever port this attempt used.
      if (error.code === 'ROOM_IN_USE') { console.error(`\n  MADRE › ${error.message}\n`); process.exit(2); }
      if (error.code !== 'EADDRINUSE') throw error;
      if (explicit) {
        console.error(`\n  MADRE › port ${port} is already in use. Another MADRE may be open there; try --port ${port + 1} or omit --port to pick one automatically.\n`);
        process.exit(2);
      }
      console.error(`  MADRE › port ${port} in use, trying ${port + 1}.`);
      port += 1;
    }
  }
  console.error(`\n  MADRE › no free port between ${options.port} and ${port}. Pass --port explicitly.\n`);
  process.exit(2);
}

const stateRoot = process.env.PULSE_HOME;
// Which project this run is about (src/salas.mjs, docs/MACROVERSO.md D-S09): the one named with
// --project; the room of Salas for `madre salas`, and for a bare `madre` from the home folder;
// anywhere else, the folder MADRE was run from. The notebook of Salas lives under MADRE's own
// state, `~/.pulse/salas` unless PULSE_HOME says where that state is.
const salasHome = stateRoot ?? join(homedir(), '.pulse');
const projectRoot = projectRootFor({ command, named: cli.named, project: option('--project', null), cwd: process.cwd(), home: homedir(), stateRoot: salasHome });
// The lobby opens on its list of projects; a project's room on its conversation.
const openPath = isSalasRoom(projectRoot, salasHome) ? '/salas' : '';
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 5)) {
  console.error(`\n  MADRE › MADRE needs Node 22.5 or newer (found ${process.version}): the room's memory runs on node:sqlite.\n`);
  process.exit(2);
}
if (has('--version') || has('-v') || command === 'version') {
  // Version and commit, so a report can name exactly what ran.
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  let commit = '';
  try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* installed from npm: no repo */ }
  console.log(`madre ${pkg.version}${commit ? ` · ${commit}` : ''} · node ${process.version}`);
  process.exit(0);
}
// A command that only reads leaves nothing behind (QA 1.1.0, NUE-37): after uninstalling, `madre
// doctor` made ~/.pulse again, with Home's folder and the update cache in it.
const onlyReads = command === 'doctor' || command === 'check-module';
if (command !== 'help' && !(onlyReads && isSalasRoom(projectRoot, salasHome))) {
  // The notebook of Salas is MADRE's own folder: made here, empty, the first time it is opened
  // (D-S08). If it cannot be made, the check below says so, as for any folder that is not there.
  if (isSalasRoom(projectRoot, salasHome)) await ensureSalasProject(salasHome).catch((error) => console.error(`  MADRE › could not make the folder of Salas at ${projectRoot}: ${error.message}`));
  const stats = await stat(projectRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    console.error(`\n  MADRE › project folder not found: ${projectRoot}\n  Pass an existing directory with --project, or run MADRE from inside the project.\n`);
    process.exit(2);
  }
}
const startConfig = await loadConfig(stateRoot);
applyConfigToEnv(startConfig);
// The terminal speaks the language MADRE was set to (QA 1.1.0, NUE-36): Spanish until someone
// chooses English, as the room does. PULSE_LANGUAGE still wins.
const { setLanguage: speakIn, t } = await import('../src/i18n.mjs');
speakIn(process.env.PULSE_LANGUAGE ?? startConfig?.language ?? 'es');

if (command === 'doctor' && (has('--catalog') || has('--conditions'))) {
  // The same knowledge base MU/TH/UR uses in the room, printed for this platform.
  const { CONDITIONS, findConditions, fixesFor, PLATFORMS } = await import('../public/troubleshooting.js');
  const query = option('--catalog', '') || option('--conditions', '') || '';
  const platform = PLATFORMS[process.platform] ? process.platform : 'linux';
  const list = query && !query.startsWith('--') ? findConditions(query) : CONDITIONS;
  console.log(`\nDIAGNOSTICS · KNOWN CONDITIONS · ${list.length} OF ${CONDITIONS.length} · ${PLATFORMS[platform].label.toUpperCase()} / ${PLATFORMS[platform].shell.toUpperCase()}\n`);
  for (const condition of list) {
    console.log(`▌ ${condition.title}`);
    console.log(`  ${condition.id} · ${condition.severity}${condition.agent ? ` · @${condition.agent}` : ''}`);
    console.log(`  ${condition.diagnosis}`);
    console.log(`  → ${condition.remedy}`);
    const fixes = fixesFor(condition, platform);
    if (fixes.length) console.log(fixes.map((line) => `    ${line}`).join('\n'));
    if (condition.perAgent) for (const [id, byPlatform] of Object.entries(condition.perAgent)) { const lines = byPlatform[platform] ?? byPlatform.darwin ?? []; if (lines.length) console.log(`    # @${id}\n${lines.map((line) => `    ${line}`).join('\n')}`); }
    console.log('');
  }
  process.exitCode = 0;
} else if (command === 'dataset') {
  // Export the room's dataset without opening the room: the same files the server writes.
  const { createHash } = await import('node:crypto');
  const { join, basename, resolve: resolvePath } = await import('node:path');
  const { homedir } = await import('node:os');
  const { realpath } = await import('node:fs/promises');
  const { EventStore } = await import('../src/event-store.mjs');
  const { RoomMemory } = await import('../src/memory.mjs');
  const { exportDataset } = await import('../src/dataset.mjs');
  const root = stateRoot ?? process.env.PULSE_HOME ?? join(homedir(), '.pulse');
  const canonical = await realpath(projectRoot).catch(() => resolvePath(projectRoot));
  const roomId = `${basename(canonical) || 'root'}-${createHash('sha256').update(canonical).digest('hex').slice(0, 16)}`;
  const roomDir = join(root, 'rooms', roomId);
  const store = await new EventStore(join(roomDir, 'events.jsonl')).initialize();
  const memory = await new RoomMemory(join(roomDir, 'memory.sqlite')).initialize(store).catch(() => null);
  const result = await exportDataset({ events: await store.readAll(), notes: memory ? memory.memories({ limit: 5000 }) : [], dir: join(roomDir, 'dataset'), project: basename(canonical), home: homedir() });
  memory?.close();
  if (has('--json')) console.log(JSON.stringify(result, null, 2));
  else console.log(`\nMADRE dataset · ${result.project}\n\n  pairs      ${result.pairs} (${result.turns} turns · ${result.notes} notes)\n  train      ${result.train}\n  valid      ${result.valid}\n  by agent   ${Object.entries(result.byAgent).map(([id, n]) => `@${id} ${n}`).join(' · ') || '-'}\n  folder     ${result.dir}\n\n  Train it: docs/training/README.md (mlx-lm on Apple Silicon), then \`ollama create madre-${result.project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\` and @madre picks it up.\n`);
  process.exitCode = 0;
} else if (command === 'doctor') {
  const agents = await detectAgents();
  const probes = await probeAll(agents);
  const { localIntelligence, madreOnline } = await import('../src/setup.mjs');
  const ollama = await localIntelligence();
  const report = agents.map((agent) => ({ ...agent, session: probes[agent.id] }));
  const result = {
    ok: report.some((agent) => isOnline(agent, agent.session)) || madreOnline(ollama),
    node: process.version,
    project: projectRoot,
    agents: report,
    ollama: { running: Boolean(ollama.running), chatModel: ollama.chatModel ?? null, embedModel: ollama.embedModel ?? null, madre: madreOnline(ollama) },
  };
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const { checkForUpdate, detectInstall, updateCommand } = await import('../src/updates.mjs');
  const { join: joinPath } = await import('node:path');
  const { homedir } = await import('node:os');
  const stateFolder = process.env.PULSE_HOME ?? joinPath(homedir(), '.pulse');
  const kept = await stat(stateFolder).then((found) => found.isDirectory(), () => false);
  const check = await checkForUpdate({ name: pkg.name, current: pkg.version, cacheFile: kept ? joinPath(stateFolder, 'updates.json') : null, enabled: process.env.PULSE_UPDATE_CHECK !== '0' });
  const update = { ...check, command: updateCommand(detectInstall({ projectRoot }), pkg.name, check.latest ?? 'latest') };
  result.update = update;

  if (has('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${t('MADRE doctor')}\n`);
    for (const agent of report) {
      const mark = agent.ready ? t('ready') : agent.detected ? t('detected') : t('not found');
      const session = agent.detected ? ` · ${agent.session.state}${agent.session.detail ? ` (${agent.session.detail})` : ''}` : '';
      console.log(`  ${agent.label.padEnd(10)} ${mark}${agent.version ? ` · ${agent.version}` : ''}${session}`);
    }
    console.log(`  ${'Ollama'.padEnd(10)} ${ollama.disabled ? t('ignored (PULSE_OLLAMA=0)') : ollama.running ? `${t('running')}${ollama.chatModel ? ` · ${t('@madre with {model}', { model: ollama.chatModel })}` : ` · ${t('no chat model yet')}`}${ollama.embedModel ? ` · ${t('embeddings {model}', { model: ollama.embedModel })}` : ''}` : t('not running · optional')}`);
    console.log(`  ${'MADRE'.padEnd(10)} ${update.current}${update.available ? ` · ${t('{version} available', { version: update.latest })} · ${update.command}` : update.latest ? ` · ${t('up to date')}` : update.enabled ? ` · ${t('npm not reachable')}` : ` · ${t('update check off (PULSE_UPDATE_CHECK=0)')}`}`);
    console.log(`\n  ${t('Project').padEnd(10)} ${result.project}`);
    console.log(result.ok ? `\n${t('Ready to start. Known conditions and fixes: `madre doctor --catalog [query]`.')}\n` : `\n${t('No agent is online yet. Run `madre`: Home opens anyway and walks you through installing and connecting one. Known conditions and fixes: `madre doctor --catalog`.')}\n`);
  }
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'setup') {
  const { action, online } = await runSetup({ projectRoot, stateRoot });
  if (action === 'start') {
    await openRoom({ port: Number(option('--port', DEFAULT_PORT)), projectRoot, openBrowser: !has('--no-open'), openPath });
  } else {
    process.exitCode = action === 'report' && !online ? 1 : 0;
  }
} else if (command === 'start' || command === 'salas' || command === 'lobby') {
  // `madre salas` is `madre start` on the notebook of Salas (projectRoot, above): the same look
  // for a room already open, the same walk up the ports, the same browser unless --no-open.
  const port = Number(option('--port', DEFAULT_PORT));
  const noOpen = has('--no-open');
  // First contact happens in the room, not here: MADRE opens even with nobody online and the
  // bridge walks the human through installing and signing in. `madre setup` keeps the terminal
  // wizard for whoever prefers it, and `--setup` asks for it explicitly.
  if (has('--setup')) {
    const { action } = await runSetup({ projectRoot, stateRoot });
    if (action !== 'start') process.exit(0);
  }
  // A room for this project may already be open. Show that one instead of starting a second.
  const running = await roomAlreadyOpen(port, projectRoot);
  if (running) {
    const address = withFicha(`${running.url}${openPath}`, await readFicha(salasHome));
    console.log(`\nMADRE is already open for this project\n\n  ${address}\n  Project: ${projectRoot}\n  Close that room first if you want a fresh one.\n`);
    if (!noOpen) await openUrl(address);
    process.exit(0);
  }
  await openRoom({ port, projectRoot, openBrowser: !noOpen, openPath });
} else if (command === 'check-module') {
  // The community Market's check (src/market-check.mjs): what the madre-mercado repository's CI runs on
  // every pull request, and what anyone can run before sending one.
  const file = option('--file', null);
  const entryFile = option('--entry', null);
  if (!file) { console.error('Usage: madre check-module --file <module.mjs> [--entry <entrada.json>] [--json] [--lang es]'); process.exit(2); }
  // In English unless asked otherwise, whatever MADRE speaks elsewhere: this check runs in the
  // madre-mercado repository's CI, whose pull requests' summary is asked for in Spanish (--lang es).
  (await import('../src/i18n.mjs')).setLanguage(option('--lang', 'en'));
  const { checkSubmission } = await import('../src/market-check.mjs');
  const text = await readFile(file, 'utf8');
  const entry = entryFile ? JSON.parse(await readFile(entryFile, 'utf8')) : null;
  const { basename: fileName } = await import('node:path');
  const result = await checkSubmission({ text, entry, name: fileName(file) });
  if (has('--json')) console.log(JSON.stringify({ ...result, markdown: undefined }, null, 2));
  else console.log(result.markdown);
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'help') {
  console.log(t(HELP_TEXT));
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
