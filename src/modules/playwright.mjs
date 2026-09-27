// PLAYWRIGHT: a headless browser for the crew, pointed only at this MADRE. Agents open the
// RIPLEY preview of project files, click, read the console and take screenshots into the turn's
// scratch folder. Runs @playwright/mcp per turn, isolated, with allowed origins limited to the
// room's own address: nothing else on the network is reachable through it.

import { join } from 'node:path';
import { t } from '../i18n.mjs';
import { defineModule } from './sdk.mjs';
import { packageVersion } from './helpers.mjs';

export const PLAYWRIGHT_PACKAGE = '@playwright/mcp';
export const PLAYWRIGHT_BROWSERS = ['chromium', 'firefox', 'webkit'];
export const PLAYWRIGHT_SERVER_NAME = 'pulse-playwright';
// The tools @playwright/mcp exposes that a room turn may use. Screenshots and files land in scratch.
export const PLAYWRIGHT_TOOLS = ['browser_navigate', 'browser_navigate_back', 'browser_snapshot', 'browser_click', 'browser_type', 'browser_fill_form', 'browser_hover', 'browser_press_key', 'browser_select_option', 'browser_wait_for', 'browser_console_messages', 'browser_network_requests', 'browser_take_screenshot', 'browser_resize', 'browser_tabs', 'browser_close'];

let probe = { at: 0, version: null };
// Is @playwright/mcp installed where npx can find it without downloading? Read from the package
// itself, never asked of it: `npx --no <package> --version` answers with npm's own version and
// exits cleanly when the package is not there, so it said 11.16.0 for a server never installed.
export async function playwrightVersion({ env = process.env, projectRoot = process.cwd(), now = Date.now(), fresh = false } = {}) {
  if (!fresh && now - probe.at < 60000) return probe.version;
  const version = await packageVersion(PLAYWRIGHT_PACKAGE, { env, projectRoot });
  probe = { at: now, version };
  return version;
}

export function playwrightServerFor({ port, outputDir, browser = 'chromium', headless = true }) {
  return {
    name: PLAYWRIGHT_SERVER_NAME,
    command: 'npx',
    // `--` or npm eats them: without the separator npm takes --headless, --isolated and the
    // rest as its own config, hands the server only their bare values, and the server exits with
    // "too many arguments" before it speaks a word of MCP. The agent sees CONNECTION_CLOSED.
    args: ['--no', '@playwright/mcp', '--', ...(headless ? ['--headless'] : []), '--isolated', '--browser', browser, '--allowed-origins', `http://127.0.0.1:${port};http://localhost:${port}`, '--blocked-origins', '*', '--output-dir', outputDir, '--no-sandbox'],
    env: {},
    tools: PLAYWRIGHT_TOOLS,
    brief: `a headless browser that reaches only this MADRE at http://127.0.0.1:${port}. Open a project file rendered by RIPLEY at http://127.0.0.1:${port}/preview/project/<path>, click, read the console and network, take screenshots (they land in ${outputDir}). Nothing else on the network is reachable through it.`,
  };
}

export default defineModule({
  id: 'playwright',
  name: 'PLAYWRIGHT',
  vendor: 'MADRE · Playwright MCP',
  tracks: { name: PLAYWRIGHT_PACKAGE, npm: PLAYWRIGHT_PACKAGE },
  summary: 'Hands every agent a headless browser that reaches only this room: it opens the RIPLEY preview of a page, clicks through it, reads the console and takes screenshots.',
  creates: ['nothing in the project \u00b7 screenshots land in .pulse/out/<turn>/', 'a switch in ~/.pulse/config.json', 'a browser per turn, started and stopped by the CLI', 'no origin but this room is reachable through it'],
  requires: ['@playwright/mcp and a chromium browser on this machine', 'RIPLEY on, to have pages to open'],
  settings: { enabled: false, browser: 'chromium', headless: true },
  card: 'switch',
  controls: [
    { key: 'browser', label: 'BROWSER', type: 'select', options: PLAYWRIGHT_BROWSERS, note: 'Which browser engine the agents drive.' },
    { key: 'headless', label: 'SHOW THE WINDOW', type: 'switch', invert: true, note: 'Off, the browser runs headless. On, it opens on this screen so you can watch.' },
  ],
  async status(ctx) {
    const version = await playwrightVersion({ env: ctx.env, projectRoot: ctx.projectRoot });
    return {
      runs: [{ name: PLAYWRIGHT_PACKAGE, version }],
      settings: { browser: ctx.settings.browser ?? 'chromium', headless: ctx.settings.headless !== false },
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? (version ? `${t('on')} · ${ctx.settings.browser}` : t('on · the browser server is not installed')) : version ? t('off') : t('off · the browser server is not installed') },
      preflight: version ? { ok: true, problems: [] } : { ok: false, problems: ['Install the browser server first: npm install -g @playwright/mcp, then its browser: npx @playwright/mcp install-browser chrome-for-testing'] },
      install: { display: ctx.settings.enabled ? 'disable PLAYWRIGHT' : 'enable PLAYWRIGHT (config.json)', platforms: ['codex', 'claude', 'gemini', 'opencode'] },
    };
  },
  // Getting the browser server onto this computer, or a newer one. Installed globally, which is
  // where `npx --no` looks for it at turn time without downloading anything.
  async updatePlan(ctx, { latest = null } = {}) {
    const target = latest ? `${PLAYWRIGHT_PACKAGE}@${latest}` : PLAYWRIGHT_PACKAGE;
    return {
      command: 'npm',
      args: ['install', '-g', target],
      display: `npm install -g ${target}`,
      note: 'Installs the browser server for every project on this computer. A browser itself may still be missing; the card says so if it is.',
      after: async () => { await playwrightVersion({ env: ctx.env, projectRoot: ctx.projectRoot, fresh: true }); },
    };
  },
  async toolsForTurn(ctx, turn) {
    if (!(await playwrightVersion({ env: ctx.env, projectRoot: ctx.projectRoot }))) return [];
    if (turn.mode === 0) return [];   // a ghost turn leaves no screenshots and opens no browser
    const outputDir = turn.scratchDir ?? join(turn.roomDir ?? ctx.stateRoot, 'playwright');
    return [playwrightServerFor({ port: turn.port, outputDir, browser: ctx.settings.browser ?? 'chromium', headless: ctx.settings.headless !== false })];
  },
  conditions: [{
    id: 'playwright-missing',
    code: 'MU-054',
    severity: 'informational',
    title: 'PLAYWRIGHT: the browser server is not installed',
    match: /@playwright\/mcp|playwright.*not (found|installed)|browser server/i,
    diagnosis: 'The PLAYWRIGHT module runs @playwright/mcp per turn. Two different things have to be on this computer and only one of them is the package: the server, and the browser build that this version of it expects. A server that starts without its browser answers every tool call with "Browser … is not installed", and one that cannot start at all reaches the agent as CONNECTION_CLOSED.',
    remedy: 'Install the server once, globally, then its browser — the browser is downloaded by the server itself, not by the playwright CLI — and RECHECK in MODULES.',
    fixes: { darwin: ['npm install -g @playwright/mcp', 'npx @playwright/mcp install-browser chrome-for-testing'], linux: ['npm install -g @playwright/mcp', 'npx @playwright/mcp install-browser chrome-for-testing'] },
  }],
});
