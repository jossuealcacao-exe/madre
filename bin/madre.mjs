#!/usr/bin/env node

import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { startPulse } from '../src/server.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';
import { probeAll } from '../src/auth-probe.mjs';
import { applyConfigToEnv, loadConfig } from '../src/config.mjs';
import { isOnline, runSetup } from '../src/setup.mjs';
import { parseArgs } from '../src/cli-args.mjs';

const cli = parseArgs(process.argv.slice(2));
const { command } = cli;
const option = (name, fallback) => cli.option(name.replace(/^--/, ''), fallback);
const has = (name) => cli.has(name.replace(/^--/, ''));

// With an explicit --port a busy port is an error the user asked for. Without
// one, MOTHER walks up to the next free port so a second room just opens.
async function openRoom(options) {
  const explicit = cli.explicit('port');
  let port = options.port;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await startPulse({ ...options, port });
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      if (explicit) {
        console.error(`\n  MOTHER › port ${port} is already in use. Another MADRE may be open there; try --port ${port + 1} or omit --port to pick one automatically.\n`);
        process.exit(2);
      }
      console.error(`  MOTHER › port ${port} in use, trying ${port + 1}.`);
      port += 1;
    }
  }
  console.error(`\n  MOTHER › no free port between ${options.port} and ${port}. Pass --port explicitly.\n`);
  process.exit(2);
}

const projectRoot = resolve(option('--project', process.cwd()));
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 5)) {
  console.error(`\n  MOTHER › MADRE needs Node 22.5 or newer (found ${process.version}): the room's memory runs on node:sqlite.\n`);
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
const stateRoot = process.env.PULSE_HOME;
if (command !== 'help') {
  const stats = await stat(projectRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    console.error(`\n  MOTHER › project folder not found: ${projectRoot}\n  Pass an existing directory with --project, or run MADRE from inside the project.\n`);
    process.exit(2);
  }
}
applyConfigToEnv(await loadConfig(stateRoot));

if (command === 'doctor' && (has('--catalog') || has('--conditions'))) {
  // The same knowledge base MU/TH/UR uses in the room, printed for this platform.
  const { CONDITIONS, fixesFor, searchConditions, PLATFORMS } = await import('../public/troubleshooting.js');
  const query = option('--catalog', '') || option('--conditions', '') || '';
  const platform = PLATFORMS[process.platform] ? process.platform : 'linux';
  const list = query && !query.startsWith('--') ? searchConditions(query) : CONDITIONS;
  console.log(`\nMU/TH/UR · KNOWN CONDITIONS · ${list.length} OF ${CONDITIONS.length} · ${PLATFORMS[platform].label.toUpperCase()} / ${PLATFORMS[platform].shell.toUpperCase()}\n`);
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
  const check = await checkForUpdate({ name: pkg.name, current: pkg.version, cacheFile: joinPath(process.env.PULSE_HOME ?? joinPath(homedir(), '.pulse'), 'updates.json'), enabled: process.env.PULSE_UPDATE_CHECK !== '0' });
  const update = { ...check, command: updateCommand(detectInstall({ projectRoot }), pkg.name, check.latest ?? 'latest') };
  result.update = update;

  if (has('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nMADRE doctor\n');
    for (const agent of report) {
      const mark = agent.ready ? 'ready' : agent.detected ? 'detected' : 'not found';
      const session = agent.detected ? ` · ${agent.session.state}${agent.session.detail ? ` (${agent.session.detail})` : ''}` : '';
      console.log(`  ${agent.label.padEnd(10)} ${mark}${agent.version ? ` · ${agent.version}` : ''}${session}`);
    }
    console.log(`  ${'Ollama'.padEnd(10)} ${ollama.disabled ? 'ignored (PULSE_OLLAMA=0)' : ollama.running ? `running${ollama.chatModel ? ` · @madre with ${ollama.chatModel}` : ' · no chat model yet'}${ollama.embedModel ? ` · embeddings ${ollama.embedModel}` : ''}` : 'not running · optional'}`);
    console.log(`  ${'MADRE'.padEnd(10)} ${update.current}${update.available ? ` · ${update.latest} available · ${update.command}` : update.latest ? ' · up to date' : update.enabled ? ' · npm not reachable' : ' · update check off (PULSE_UPDATE_CHECK=0)'}`);
    console.log(`\n  Project    ${result.project}`);
    console.log(result.ok ? '\nReady to start. Known conditions and fixes: `madre doctor --catalog [query]`.\n' : '\nNo agent is online. Run `madre setup`. Known conditions and fixes: `madre doctor --catalog`.\n');
  }
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'setup') {
  const { action, online } = await runSetup({ projectRoot, stateRoot });
  if (action === 'start') {
    await openRoom({ port: Number(option('--port', '4317')), projectRoot, openBrowser: !has('--no-open') });
  } else {
    process.exitCode = action === 'report' && !online ? 1 : 0;
  }
} else if (command === 'start') {
  const port = Number(option('--port', '4317'));
  const noOpen = has('--no-open');
  // First contact happens in the room, not here: MADRE opens even with nobody online and the
  // bridge walks the human through installing and signing in. `madre setup` keeps the terminal
  // wizard for whoever prefers it, and `--setup` asks for it explicitly.
  if (has('--setup')) {
    const { action } = await runSetup({ projectRoot, stateRoot });
    if (action !== 'start') process.exit(0);
  }
  await openRoom({ port, projectRoot, openBrowser: !noOpen });
} else if (command === 'help') {
  console.log(`MADRE

  madre start [--project PATH] [--port 4317] [--no-open] [--setup]
              Without --port, a busy 4317 falls through to the next free port.
  madre setup [--project PATH] [--port 4317] [--no-open]
  madre doctor [--project PATH] [--json]

  start   Opens the project room. With nobody online, runs setup first.
  setup   Detects the agents on this computer, shows who has a session,
          and runs each agent's own sign-in from here.
  doctor  Prints the same diagnosis without the wizard.
`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
