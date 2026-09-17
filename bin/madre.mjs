#!/usr/bin/env node

import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
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
const stateRoot = process.env.PULSE_HOME;
if (command !== 'help') {
  const stats = await stat(projectRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    console.error(`\n  MOTHER › project folder not found: ${projectRoot}\n  Pass an existing directory with --project, or run MADRE from inside the project.\n`);
    process.exit(2);
  }
}
applyConfigToEnv(await loadConfig(stateRoot));

if (command === 'doctor') {
  const agents = await detectAgents();
  const probes = await probeAll(agents);
  const report = agents.map((agent) => ({ ...agent, session: probes[agent.id] }));
  const result = {
    ok: report.some((agent) => isOnline(agent, agent.session)),
    node: process.version,
    project: projectRoot,
    agents: report,
  };

  if (has('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nMADRE doctor\n');
    for (const agent of report) {
      const mark = agent.ready ? 'ready' : agent.detected ? 'detected' : 'not found';
      const session = agent.detected ? ` · ${agent.session.state}${agent.session.detail ? ` (${agent.session.detail})` : ''}` : '';
      console.log(`  ${agent.label.padEnd(10)} ${mark}${agent.version ? ` · ${agent.version}` : ''}${session}`);
    }
    console.log(`\n  Project    ${result.project}`);
    console.log(result.ok ? '\nReady to start.\n' : '\nNo agent is online. Run `madre setup`.\n');
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
  // First contact: in a terminal with nobody online, MOTHER walks the user
  // through configuring an agent before the room opens.
  if (process.stdin.isTTY && process.stdout.isTTY && !has('--no-setup')) {
    const agents = await detectAgents();
    const probes = await probeAll(agents);
    if (!agents.some((agent) => isOnline(agent, probes[agent.id]))) {
      const { action } = await runSetup({ projectRoot, stateRoot });
      if (action !== 'start') process.exit(0);
    }
  }
  await openRoom({ port, projectRoot, openBrowser: !noOpen });
} else if (command === 'help') {
  console.log(`MADRE

  madre start [--project PATH] [--port 4317] [--no-open] [--no-setup]
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
