import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { BRANDS } from '../public/brands.js';
import { AGENT_SETUP, probeAll } from './auth-probe.mjs';
import { detectAgents } from './runtime-detection.mjs';
import { loadConfig, updateConfig } from './config.mjs';

/* ---------- MOTHER palette for the terminal ---------- */

export function makePalette({ colors = stdout.isTTY && !process.env.NO_COLOR, depth = stdout.getColorDepth?.() ?? 4 } = {}) {
  if (!colors) {
    const plain = (text) => String(text);
    return { phosphor: plain, dim: plain, bold: plain, agent: () => plain, danger: plain, warn: plain, reset: '' };
  }
  const truecolor = depth >= 24;
  const hex = (value) => {
    const n = parseInt(value.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const fg = (value) => {
    if (!truecolor) return '[38;5;114m';
    const [r, g, b] = hex(value);
    return `[38;2;${r};${g};${b}m`;
  };
  const wrap = (open) => (text) => `${open}${text}[0m`;
  return {
    phosphor: wrap(fg('#9bff66')),
    dim: wrap('[2m'),
    bold: wrap('[1m'),
    danger: wrap(truecolor ? fg('#ff7b72') : '[31m'),
    warn: wrap(truecolor ? fg('#ffd166') : '[33m'),
    agent: (id) => wrap(truecolor ? fg(BRANDS[id]?.color ?? '#8a8f98') : '[36m'),
    reset: '[0m',
  };
}

const SESSION_LABEL = {
  'signed-in': 'SESSION OK',
  'signed-out': 'NO SESSION',
  unknown: 'SESSION ?',
  'not-installed': 'NOT FOUND',
};

const glyphFor = (agent, probe) => {
  if (!agent.detected) return '○';
  if (agent.ready && probe.state === 'signed-in') return '◉';
  return '◌';
};

export function isOnline(agent, probe) {
  return Boolean(agent.ready && probe?.state === 'signed-in');
}

/* ---------- report (pure, testable) ---------- */

export function renderReport({ agents, probes, projectRoot, config = {}, palette = makePalette({ colors: false }), width = 72 }) {
  const p = palette;
  const bar = p.phosphor('▌');
  const lines = [];
  lines.push('');
  lines.push(`${bar} ${p.bold(p.phosphor('MADRE'))}${' '.repeat(Math.max(1, width - 30))}${p.dim('INTERFACE · SETUP')}`);
  lines.push(`${bar} ${p.dim(projectRoot)}`);
  lines.push('');
  lines.push(`  ${p.dim('┌ AGENTS ' + '─'.repeat(Math.max(4, width - 12)))}`);
  for (const agent of agents) {
    const probe = probes[agent.id] ?? { state: 'unknown', detail: '' };
    const paint = p.agent(agent.id);
    const glyph = paint(glyphFor(agent, probe));
    const name = paint(agent.id.toUpperCase().padEnd(9));
    const vendor = p.dim((BRANDS[agent.id]?.vendor ?? '').padEnd(10));
    const status = !agent.detected
      ? p.dim('NOT FOUND ')
      : agent.ready ? p.phosphor('READY     ') : p.warn('DETECTED  ');
    const session = !agent.detected
      ? ''
      : probe.state === 'signed-in' ? p.phosphor(SESSION_LABEL[probe.state])
        : probe.state === 'signed-out' ? p.danger(SESSION_LABEL[probe.state]) : p.warn(SESSION_LABEL[probe.state] ?? 'SESSION ?');
    const detail = [probe.detail, agent.version].filter(Boolean).join(' · ');
    lines.push(`  ${p.dim('│')} ${glyph} ${name} ${vendor} ${status} ${session}${detail ? p.dim(`  ${detail}`) : ''}`);
    if (agent.id === 'opencode' && agent.detected) {
      const model = process.env.PULSE_OPENCODE_MODEL ?? config.opencode?.model;
      lines.push(`  ${p.dim('│')}   ${p.dim(model ? `model ${model}` : 'model: provider default (set one if the default provider has no session)')}`);
    }
  }
  lines.push(`  ${p.dim('└' + '─'.repeat(Math.max(4, width - 4)))}`);
  const online = agents.filter((agent) => isOnline(agent, probes[agent.id]));
  const verdict = online.length
    ? `${online.length} OF ${agents.length} AGENTS ONLINE. ROOM CAN OPEN.`
    : `NO AGENT ONLINE. CONFIGURE ONE TO OPEN THE ROOM.`;
  lines.push('');
  lines.push(`  ${p.phosphor('MOTHER')}${p.dim(' ›')} ${p.bold(verdict)}`);
  return lines.join('\n');
}

/* ---------- interactive wizard ---------- */

function runInTerminal(path, args) {
  return new Promise((resolve) => {
    const child = spawn(path, args, { stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function listOpenCodeModels(agent) {
  return new Promise((resolve) => {
    const child = spawn(agent.path, ['models'], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
    child.on('close', () => { clearTimeout(timer); resolve(out.split('\n').map((line) => line.trim()).filter((line) => /^[\w.-]+\/[\w.:-]+$/.test(line))); });
    child.on('error', () => resolve([]));
  });
}

export async function runSetup({ projectRoot, stateRoot, interactive = stdin.isTTY && stdout.isTTY, palette = makePalette(), log = console.log } = {}) {
  const p = palette;
  let agents = await detectAgents();
  let probes = await probeAll(agents);
  let config = await loadConfig(stateRoot);
  log(renderReport({ agents, probes, projectRoot, config, palette: p }));

  if (!interactive) {
    // Without a terminal there is nobody to walk through; report and hand
    // back. `online` lets the caller decide (exit codes, CI checks).
    return { action: 'report', online: agents.some((agent) => isOnline(agent, probes[agent.id])), agents, probes };
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const ask = (question) => rl.question(`\n  ${p.phosphor('›')} ${question} `);
  try {
    for (;;) {
      const menu = agents.map((agent, index) => `${p.dim(`[${index + 1}]`)} ${p.agent(agent.id)(agent.id)}`).join('  ');
      log(`\n  ${menu}  ${p.dim('[m]')} opencode model  ${p.dim('[r]')} rescan  ${p.dim('[s]')} start room  ${p.dim('[q]')} quit`);
      const answer = (await ask('select')).trim().toLowerCase();
      if (answer === 'q') return { action: 'quit', agents, probes };
      if (answer === 's') {
        if (!agents.some((agent) => isOnline(agent, probes[agent.id]))) {
          log(`  ${p.warn('MOTHER ›')} no agent online; the room would open empty. Configure one first or press s again to open anyway.`);
          const again = (await ask('start anyway? [y/N]')).trim().toLowerCase();
          if (again !== 'y') continue;
        }
        return { action: 'start', agents, probes };
      }
      if (answer === 'r') {
        agents = await detectAgents();
        probes = await probeAll(agents);
        config = await loadConfig(stateRoot);
        log(renderReport({ agents, probes, projectRoot, config, palette: p }));
        continue;
      }
      if (answer === 'm') {
        const opencode = agents.find((agent) => agent.id === 'opencode');
        if (!opencode?.detected) { log(`  ${p.dim('OpenCode is not installed.')}`); continue; }
        log(`  ${p.dim('Reading models from opencode…')}`);
        const models = await listOpenCodeModels(opencode);
        if (models.length) log(`  ${p.dim(models.slice(0, 24).join('\n  '))}${models.length > 24 ? p.dim(`\n  … ${models.length - 24} more`) : ''}`);
        const model = (await ask('provider/model for MADRE (empty to clear)')).trim();
        config = await updateConfig(stateRoot, { opencode: { model: model || undefined } });
        if (model) process.env.PULSE_OPENCODE_MODEL = model; else delete process.env.PULSE_OPENCODE_MODEL;
        log(`  ${p.phosphor('saved')} ${p.dim(model ? `opencode.model = ${model}` : 'opencode.model cleared')}`);
        continue;
      }
      const index = Number(answer) - 1;
      const agent = agents[index];
      if (!agent) { log(`  ${p.dim('unknown option')}`); continue; }
      const setup = AGENT_SETUP[agent.id];
      const probe = probes[agent.id];
      if (!agent.detected) {
        log(`  ${p.agent(agent.id)(agent.id)} ${p.dim('is not installed. Install it, then press r to rescan:')}`);
        for (const hint of setup.install) log(`    ${p.phosphor('$')} ${hint}`);
        continue;
      }
      if (probe.state === 'signed-in') {
        log(`  ${p.agent(agent.id)(agent.id)} ${p.dim(`already has a session (${probe.detail}). Sign in again? [y/N]`)}`);
        if ((await ask('')).trim().toLowerCase() !== 'y') continue;
      }
      log(`  ${p.dim(setup.loginNote)}`);
      if (setup.interactive || !setup.login.length) {
        log(`  ${p.dim(`Handing the terminal to ${agent.id}. Exit it when you are done and MADRE will rescan.`)}`);
        await runInTerminal(agent.path, []);
      } else {
        await runInTerminal(agent.path, setup.login);
      }
      probes = await probeAll(agents);
      log(renderReport({ agents, probes, projectRoot, config, palette: p }));
    }
  } finally {
    rl.close();
  }
}
