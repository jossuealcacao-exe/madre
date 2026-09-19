// PLAYWRIGHT: a headless browser for the crew, pointed only at this MADRE. Agents open the
// RIPLEY preview of project files, click, read the console and take screenshots into the turn's
// scratch folder. Runs @playwright/mcp per turn, isolated, with allowed origins limited to the
// room's own address: nothing else on the network is reachable through it.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { defineModule } from './sdk.mjs';

const execFileAsync = promisify(execFile);
export const PLAYWRIGHT_SERVER_NAME = 'pulse-playwright';
// The tools @playwright/mcp exposes that a room turn may use. Screenshots and files land in scratch.
export const PLAYWRIGHT_TOOLS = ['browser_navigate', 'browser_navigate_back', 'browser_snapshot', 'browser_click', 'browser_type', 'browser_fill_form', 'browser_hover', 'browser_press_key', 'browser_select_option', 'browser_wait_for', 'browser_console_messages', 'browser_network_requests', 'browser_take_screenshot', 'browser_resize', 'browser_tabs', 'browser_close'];

let probe = { at: 0, version: null };
// Is @playwright/mcp installed where npx can find it without downloading? Cached a minute.
export async function playwrightVersion({ env = process.env, now = Date.now() } = {}) {
  if (now - probe.at < 60000) return probe.version;
  let version = null;
  try {
    const { stdout } = await execFileAsync('npx', ['--no', '@playwright/mcp', '--version'], { env, timeout: 15000 });
    version = stdout.trim().split('\n').pop().trim() || 'installed';
  } catch { version = null; }
  probe = { at: now, version };
  return version;
}

export function playwrightServerFor({ port, outputDir, browser = 'chromium', headless = true }) {
  return {
    name: PLAYWRIGHT_SERVER_NAME,
    command: 'npx',
    args: ['--no', '@playwright/mcp', ...(headless ? ['--headless'] : []), '--isolated', '--browser', browser, '--allowed-origins', `http://127.0.0.1:${port};http://localhost:${port}`, '--blocked-origins', '*', '--output-dir', outputDir, '--no-sandbox'],
    env: {},
    tools: PLAYWRIGHT_TOOLS,
    brief: `a headless browser that reaches only this MADRE at http://127.0.0.1:${port}. Open a project file rendered by RIPLEY at http://127.0.0.1:${port}/preview/project/<path>, click, read the console and network, take screenshots (they land in ${outputDir}). Nothing else on the network is reachable through it.`,
  };
}

export default defineModule({
  id: 'playwright',
  name: 'PLAYWRIGHT',
  vendor: 'MADRE · Playwright MCP',
  summary: 'Hands every agent a headless browser that reaches only this MADRE: open the RIPLEY preview of a page, click through it, read the console, take screenshots into the turn\'s scratch folder. Runs @playwright/mcp isolated per turn; no other origin is reachable.',
  creates: ['nothing in the project: screenshots land in .pulse/out/<turn>/', 'a playwright switch in ~/.pulse/config.json', 'a browser process per turn, started and stopped by the CLI'],
  requires: ['@playwright/mcp installed (npm install -g @playwright/mcp) and a browser (npx playwright install chromium)', 'RIPLEY on, to have pages to open'],
  settings: { enabled: false, browser: 'chromium', headless: true },
  card: 'switch',
  async status(ctx) {
    const version = await playwrightVersion({ env: ctx.env });
    return {
      version: version ?? null,
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? (version ? `on · @playwright/mcp ${version} · ${ctx.settings.browser}` : 'on · @playwright/mcp not found') : version ? `off · @playwright/mcp ${version} found` : 'off · @playwright/mcp not installed' },
      preflight: version ? { ok: true, problems: [] } : { ok: false, problems: ['Install the browser server first: npm install -g @playwright/mcp && npx playwright install chromium'] },
      install: { display: ctx.settings.enabled ? 'disable PLAYWRIGHT' : 'enable PLAYWRIGHT (config.json)', platforms: ['codex', 'claude', 'gemini', 'opencode'] },
    };
  },
  async toolsForTurn(ctx, turn) {
    if (!(await playwrightVersion({ env: ctx.env }))) return [];
    if (turn.mode === 0) return [];   // a ghost turn leaves no screenshots and opens no browser
    const outputDir = turn.scratchDir ?? join(turn.roomDir ?? ctx.stateRoot, 'playwright');
    return [playwrightServerFor({ port: turn.port, outputDir, browser: ctx.settings.browser ?? 'chromium', headless: ctx.settings.headless !== false })];
  },
  conditions: [{
    id: 'playwright-missing',
    severity: 'informational',
    title: 'PLAYWRIGHT: the browser server is not installed',
    match: /@playwright\/mcp|playwright.*not (found|installed)|browser server/i,
    diagnosis: 'The PLAYWRIGHT module runs @playwright/mcp per turn. It is on, or you tried to open it, but npx cannot find the package without downloading, or no browser is installed.',
    remedy: 'Install it once, globally, then RECHECK in MODULES.',
    fixes: { darwin: ['npm install -g @playwright/mcp', 'npx playwright install chromium'], linux: ['npm install -g @playwright/mcp', 'npx playwright install --with-deps chromium'], win32: ['npm install -g @playwright/mcp', 'npx playwright install chromium'] },
  }],
});
