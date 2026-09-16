#!/usr/bin/env node

import { resolve } from 'node:path';
import { startPulse } from '../src/server.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';
import { probeAll } from '../src/auth-probe.mjs';
import { applyConfigToEnv, loadConfig } from '../src/config.mjs';
import { isOnline, runSetup } from '../src/setup.mjs';

const args = process.argv.slice(2);
const helpFlags = new Set(['help', '--help', '-h']);
const command = helpFlags.has(args[0])
  ? 'help'
  : args[0]?.startsWith('-') ? 'start' : (args.shift() ?? 'start');

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function openRoom(options) {
  try {
    await startPulse(options);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n  MOTHER › port ${options.port} is already in use. Another PULSE may be open there; try --port ${options.port + 1}.\n`);
      process.exit(2);
    }
    throw error;
  }
}

const projectRoot = resolve(option('--project', process.cwd()));
const stateRoot = process.env.PULSE_HOME;
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

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nPULSE doctor\n');
    for (const agent of report) {
      const mark = agent.ready ? 'ready' : agent.detected ? 'detected' : 'not found';
      const session = agent.detected ? ` · ${agent.session.state}${agent.session.detail ? ` (${agent.session.detail})` : ''}` : '';
      console.log(`  ${agent.label.padEnd(10)} ${mark}${agent.version ? ` · ${agent.version}` : ''}${session}`);
    }
    console.log(`\n  Project    ${result.project}`);
    console.log(result.ok ? '\nReady to start.\n' : '\nNo agent is online. Run `pulse setup`.\n');
  }
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'setup') {
  const { action, online } = await runSetup({ projectRoot, stateRoot });
  if (action === 'start') {
    await openRoom({ port: Number(option('--port', '4317')), projectRoot, openBrowser: !args.includes('--no-open') });
  } else {
    process.exitCode = action === 'report' && !online ? 1 : 0;
  }
} else if (command === 'start') {
  const port = Number(option('--port', '4317'));
  const noOpen = args.includes('--no-open');
  // First contact: in a terminal with nobody online, MOTHER walks the user
  // through configuring an agent before the room opens.
  if (process.stdin.isTTY && process.stdout.isTTY && !args.includes('--no-setup')) {
    const agents = await detectAgents();
    const probes = await probeAll(agents);
    if (!agents.some((agent) => isOnline(agent, probes[agent.id]))) {
      const { action } = await runSetup({ projectRoot, stateRoot });
      if (action !== 'start') process.exit(0);
    }
  }
  await openRoom({ port, projectRoot, openBrowser: !noOpen });
} else if (command === 'help') {
  console.log(`PULSE

  pulse start [--project PATH] [--port 4317] [--no-open] [--no-setup]
  pulse setup [--project PATH] [--port 4317] [--no-open]
  pulse doctor [--project PATH] [--json]

  start   Opens the project room. With nobody online, runs setup first.
  setup   Detects the agents on this computer, shows who has a session,
          and runs each agent's own sign-in from here.
  doctor  Prints the same diagnosis without the wizard.
`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
