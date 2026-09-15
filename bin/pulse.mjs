#!/usr/bin/env node

import { resolve } from 'node:path';
import { startPulse } from '../src/server.mjs';
import { detectAgents } from '../src/runtime-detection.mjs';

const args = process.argv.slice(2);
const command = args[0]?.startsWith('-') ? 'start' : (args.shift() ?? 'start');

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (command === 'doctor') {
  const agents = await detectAgents();
  const result = {
    ok: agents.some((agent) => agent.ready),
    node: process.version,
    project: resolve(option('--project', process.cwd())),
    agents,
  };

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nPULSE doctor\n');
    for (const agent of agents) {
      const mark = agent.ready ? 'ready' : agent.detected ? 'detected' : 'not found';
      console.log(`  ${agent.label.padEnd(10)} ${mark}${agent.version ? ` · ${agent.version}` : ''}`);
    }
    console.log(`\n  Project    ${result.project}`);
    console.log(result.ok ? '\nReady to start.\n' : '\nInstall or sign in to a supported agent first.\n');
  }
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'start') {
  const port = Number(option('--port', '4317'));
  const projectRoot = resolve(option('--project', process.cwd()));
  const noOpen = args.includes('--no-open');
  await startPulse({ port, projectRoot, openBrowser: !noOpen });
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`PULSE\n\n  pulse start [--project PATH] [--port 4317] [--no-open]\n  pulse doctor [--project PATH] [--json]\n`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
