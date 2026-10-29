#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The pictures of the user manual (1.0.5, 2026-10-21; the layout of 1.1.0, 2026-10-28): MADRE itself,
// photographed, with where each step of a section is pressed. A tool for whoever releases MADRE, like scripts/manual-pdf.mjs: it
// needs Playwright with its Chromium and cwebp; MADRE itself never does.
//
// It photographs a MADRE that is already running, in one language: the room's language is the
// process's (PULSE_LANGUAGE), so it is run once per language, against a house prepared for it — a
// HOME of its own with a project or two added, the tour and the hints seen, real exchanges in the
// project's chat (OpenCode answers with no account), Notes and Reminders on, a note and a due
// reminder. Never the author's own HOME: what is photographed is published, and the computer's own
// name is said as a plain «MacBook-Air».
//
//   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/manual-shots.mjs \
//     --lang es --home http://127.0.0.1:5100 --room http://127.0.0.1:4319 [--project mi-tienda] [--only code,notes]
//
// Each picture goes to public/assets/manual/shots/<lang>-<shot>.webp, and where its marks stand, as
// shares of the picture, to public/manual-shots.js, which public/manual.js reads.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback = null) => { const at = process.argv.indexOf(`--${name}`); return at > 0 ? process.argv[at + 1] : fallback; };
const lang = arg('lang');
const home = arg('home');
const room = arg('room');
const project = arg('project', lang === 'en' ? 'my-shop' : 'mi-tienda');
const only = arg('only')?.split(',') ?? null;
if (!['es', 'en'].includes(lang) || !home || !room) {
  console.error('Usage: node scripts/manual-shots.mjs --lang es|en --home <Home address> --room <project address> [--project name] [--only a,b]');
  process.exit(2);
}
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(join(process.env.PLAYWRIGHT, 'index.mjs')).href : 'playwright');
const WORDS = {
  es: { agents: 'Agentes', signIn: 'Cuenta de Claude', signedIn: 'Conectado', home: '~/Proyectos/', continuity: 'Continuidad', changes: 'Lo que modifica', install: 'Instalar', project: 'mi-tienda', file: 'carrito.js', folder: 'src', saver: 'Ahorro de tokens', connectors: 'Conectores (MCP)', local: 'IA local', symptom: 'Claude me pide iniciar sesión', projects: 'Qué proyectos', check: 'Revisar conexión', settingsKey: 'Ajustes', projectsCard: 'Proyectos', welcomeAgain: 'Ver la bienvenida otra vez', newChat: 'Nuevo chat', market: 'Mercado', addProject: 'Agregar proyecto', float: 'Abrirla en una ventana aparte', close: 'Cerrar' },
  en: { agents: 'Agents', signIn: 'Claude account', signedIn: 'Connected', home: '~/Projects/', continuity: 'Continuity', changes: 'What it touches', install: 'Install', project: 'my-shop', file: 'cart.js', folder: 'src', saver: 'Token saver', connectors: 'Connectors (MCP)', local: 'Local AI', symptom: 'Claude is not signed in', projects: 'Which projects', check: 'Check the connection', settingsKey: 'Settings', projectsCard: 'Projects', welcomeAgain: 'See the welcome again', newChat: 'New chat', market: 'Market', addProject: 'Add a project', float: 'Float it as a window', close: 'Close' },
}[lang];

// What is not the point of a picture is not in it: the version's corner, the first steps of a new
// house, a newer version on npm, a toast, a hint, MADRE's own cards in the chat. The note and the due
// reminder only where they are told.
const QUIET = '#colophon, #update-pill, #steps-pill, .toast, .toasts, .hint-card, .tour-hint, .neural-invite { visibility: hidden !important; } #thread-inner > .system { display: none !important; }';
const NO_NOTES = '.note-window, .reminder-due { display: none !important; }';
const MACHINE = hostname().replace(/\.local$/i, '');

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
async function settle(page, ms = 700) { await page.evaluate(() => document.fonts.ready); await wait(ms); }
// A card or a sheet left open by the house is closed; a note's window is the person's and stays.
const closeAll = (page) => page.evaluate(() => { for (const one of document.querySelectorAll('dialog[open]:not(.note-window)')) one.close(); });
async function toRoom(page, { notes = false } = {}) {
  await page.goto(room, { waitUntil: 'load' });
  await page.locator('#message').waitFor();
  // The chat drawn, not its placeholder; the project's opening, if it plays, skipped.
  await page.waitForFunction(() => [...document.querySelectorAll('.bubble')].some((one) => one.textContent.trim().length > 60), null, { timeout: 15000 }).catch(() => null);
  await page.keyboard.press('Escape').catch(() => null);
  await settle(page, 600);
  await closeAll(page);
  await page.addStyleTag({ content: QUIET + (notes ? '' : NO_NOTES) });
  await settle(page, 1200);
}
async function toHome(page) {
  await page.goto(`${home}/salas`, { waitUntil: 'load' });
  await page.locator('#sm-add').waitFor({ state: 'attached' });
  // Home's summary written, not «summing up…».
  await page.waitForFunction(() => !/summing up|resumiendo/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => null);
  await settle(page, 1500);
  await closeAll(page);
  await page.addStyleTag({ content: QUIET });
  await settle(page, 900);
}
// Settings: Home's from its sidebar key, a project's from the page.
async function homeSettings(page) { await page.locator(`.shell-key[aria-label="${WORDS.settingsKey}"]`).first().click(); await settle(page); }
async function roomSettings(page) { await page.evaluate(() => globalThis.__pulse.openSettings(true)); await settle(page); }
// The first of these on screen: a long panel has the same key further down, out of the picture.
const firstInSight = (selector, text = null) => (page) => page.evaluate(([selector, text]) => {
  for (const one of document.querySelectorAll(selector)) {
    const box = one.getBoundingClientRect();
    if (!box.width || !box.height || box.top < 0 || box.bottom > innerHeight) continue;
    if (text && !one.textContent.includes(text)) continue;
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  return null;
}, [selector, text]);
// The smallest thing on screen whose own words are these: a status, a key.
const leaf = (text) => (page) => page.evaluate((text) => {
  const all = [...document.querySelectorAll('body *')].filter((node) => { const box = node.getBoundingClientRect(); return box.width && box.height && box.top >= 0 && box.bottom <= innerHeight && node.textContent.trim() === text; });
  const one = all.find((node) => ![...node.children].some((child) => child.textContent.trim() === text));
  if (!one) return null;
  const box = one.getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}, text);
// What a panel shows of itself: its box, cut where the window ends.
const inSight = (selector) => (page) => page.evaluate((selector) => {
  const one = [...document.querySelectorAll(selector)].find((node) => node.getBoundingClientRect().width > 0);
  if (!one) return null;
  const box = one.getBoundingClientRect();
  const top = Math.max(0, box.top);
  return { x: box.x, y: top, width: box.width, height: Math.min(innerHeight, box.bottom) - top };
}, selector);
// The whole window: a picture of the page as it is, with nothing cut.
const WHOLE = () => ({ x: 0, y: 0, width: 1, height: 1, whole: true });
async function openSettingsCard(page, title) {
  await page.locator('dialog[open] .settings-card-head', { hasText: title }).first().click();
  await settle(page, 1000);
  // Settings keep a height of their own, whatever the window: taller here, so a panel's steps are
  // in one picture instead of under its fold.
  await page.evaluate(() => {
    const sheet = document.querySelector('.settings-detail')?.closest('dialog');
    if (sheet) { sheet.style.maxHeight = 'none'; sheet.style.height = 'calc(100vh - 48px)'; }
  });
  await settle(page, 600);
}
// A file of the project open in Files, two of its lines chosen: the question card's way in.
async function openFile(page) {
  await page.locator('#code-button').click();
  await settle(page, 1200);
  await page.locator('#viewer').getByText(WORDS.folder, { exact: true }).first().click();
  await settle(page, 500);
  await page.locator('#viewer').getByText(WORDS.file, { exact: true }).first().click();
  await page.locator('#viewer-body .ln').first().waitFor();
  await settle(page);
}

// Each picture: the size of the window it is taken in, what is done before it, the steps' marks in
// order (null: a step with nothing to point at), where a mark's number goes when its middle would
// cover another (`place`), and what else must be in the picture (WHOLE: all of the window).
const SHOTS = {
  welcome: {
    viewport: { width: 1280, height: 860 },
    go: async (page) => {
      await toHome(page);
      await homeSettings(page);
      await page.locator('dialog[open] .settings-card-head', { hasText: WORDS.projectsCard }).first().click();
      await settle(page, 900);
      await page.locator('.sx-row', { hasText: WORDS.welcomeAgain }).locator('button').first().click();
      // The opening plays first: a key skips it.
      for (let tries = 0; tries < 30; tries += 1) {
        await wait(400);
        if (!(await page.evaluate(() => Boolean(document.querySelector('dialog.wl.intro, dialog.wl.waiting'))))) break;
        await page.keyboard.press('Space').catch(() => null);
      }
      await page.locator('dialog.wl .wl-steps').waitFor();
      await settle(page, 1800);
    },
    marks: ['dialog.wl .wl-steps', 'dialog.wl .wl-content', (page) => page.locator('dialog.wl .wl-actions button').last()],
    place: ['right', null, 'left'],
    frame: ['dialog.wl .wl-window'],
  },
  home: {
    viewport: { width: 1280, height: 1060 },
    go: toHome,
    marks: [(page) => page.locator('.side-row', { hasText: WORDS.addProject }).first(), (page) => page.locator('article.sm-card', { hasText: project }).first(), '#sm-waiting'],
    frame: [WHOLE],
  },
  agents: {
    viewport: { width: 1280, height: 1000 },
    go: async (page) => { await toHome(page); await homeSettings(page); await openSettingsCard(page, WORDS.agents); },
    marks: [firstInSight('.settings-detail-title'), leaf(WORDS.signIn), null],
    frame: [inSight('dialog[open]:has(.settings-detail)')],
  },
  composer: {
    viewport: { width: 1280, height: 820 },
    go: toRoom,
    marks: ['#message', '.crew-orb', '.mode-chip', '.model-chip'],
    frame: [(page) => page.locator('.bubble').evaluateAll((all) => { const box = all.at(-1)?.getBoundingClientRect(); return box ? { x: box.x, y: Math.max(0, box.bottom - 260), width: box.width, height: Math.min(260, box.height) } : null; }), '#composer'],
  },
  chats: {
    viewport: { width: 1280, height: 820 },
    go: async (page) => {
      await toRoom(page);
      // The keys of a chat show where the pointer is: on the one that is not on screen.
      await page.locator('#chats .chat-row:has(.chat-split)').first().hover();
      await settle(page, 600);
    },
    marks: [(page) => page.locator('.side-row', { hasText: WORDS.newChat }).first(), (page) => page.locator('#chats .chat-row').first(), '#chats .chat-split', '#chats .chat-window'],
    place: [null, null, 'below', 'right'],
    frame: [WHOLE],
  },
  modes: {
    viewport: { width: 1280, height: 820 },
    go: async (page) => { await toRoom(page); await page.locator('.mode-chip').click(); await settle(page); },
    marks: ['.mode-option.o1', '.mode-option.o2', '.mode-option.o3', '.mode-option.o4'],
    place: ['right', 'right', 'right', 'right'],
    frame: ['.mode-option.o0', '.mode-chip', '#composer'],
  },
  copilot: {
    viewport: { width: 1280, height: 820 },
    go: async (page) => { await toRoom(page); await page.locator('.copilot-chip').click(); await settle(page); },
    marks: ['.copilot-chip', '.copilot-menu .sx-seg', '.copilot-menu .settings-switch'],
    frame: ['.copilot-menu', '#composer'],
  },
  code: {
    viewport: { width: 1440, height: 900 },
    go: async (page) => {
      await toRoom(page);
      await openFile(page);
      await page.locator('#viewer-body .ln', { hasText: /^3$/ }).click();
      await page.locator('#viewer-body .ln', { hasText: /^4$/ }).click({ modifiers: ['Shift'] });
      await settle(page, 500);
      await page.locator('#viewer-review').click();
      await settle(page);
    },
    marks: ['#code-button', (page) => page.locator('#viewer-body .ln.sel').first(), '.ask-card'],
    place: [null, null, 'left'],
    frame: [WHOLE],
  },
  memory: {
    viewport: { width: 1500, height: 860 },
    go: async (page) => {
      await toRoom(page);
      await page.locator('#nostromo-bar').click();
      await settle(page);
      // The map asks for the project's name first, unless the person said not to ask again.
      const gate = page.locator('dialog[open] input').first();
      if (await gate.isVisible().catch(() => false)) { await gate.fill(WORDS.project); await gate.press('Enter'); }
      await page.locator('#nostromo[open]').waitFor();
      await settle(page, 3500);
    },
    marks: ['#nostromo .mother-title', '#nostromo .nostromo-legend', null],
    frame: ['#nostromo'],
  },
  notes: {
    viewport: { width: 1280, height: 820 },
    go: async (page) => { await toRoom(page, { notes: true }); await page.locator('.note-window').first().waitFor({ timeout: 10000 }).catch(() => null); await settle(page, 900); },
    marks: ['#modules-button', '.note-window', '.reminder-due'],
    frame: [WHOLE],
  },
  market: {
    viewport: { width: 1280, height: 1000 },
    go: async (page) => {
      await toRoom(page);
      await page.locator('.side-row', { hasText: WORDS.market }).first().click();
      await settle(page, 2500);
    },
    marks: [(page) => page.locator('.side-row', { hasText: WORDS.market }).first(), (page) => page.locator('.mk-row', { hasText: WORDS.continuity }).first(), (page) => page.locator('.mk-row', { hasText: WORDS.continuity }).first().locator('.mk-row-side')],
    place: [null, null, 'left'],
    frame: [WHOLE],
  },
  continuity: {
    viewport: { width: 1280, height: 900 },
    go: async (page) => {
      await toRoom(page);
      await page.locator('#modules-button').click();
      await settle(page, 1000);
      await page.locator('.mods-tile', { hasText: WORDS.continuity }).first().click();
      await settle(page, 1200);
    },
    marks: [(page) => page.locator('.mods-tile', { hasText: WORDS.continuity }).first(), (page) => page.locator('.mods-sheet h3', { hasText: WORDS.changes }).first(), (page) => page.locator('dialog[open] button.primary', { hasText: new RegExp(`^\\s*${WORDS.install}\\s*$`, 'i') }).first()],
    frame: ['#modules'],
  },
  connectors: {
    viewport: { width: 1280, height: 1240 },
    go: async (page) => { await toRoom(page); await roomSettings(page); await openSettingsCard(page, WORDS.connectors); },
    marks: [firstInSight('.settings-detail-title'), firstInSight('.mcp-card-keys .sx-btn.primary'), firstInSight('.settings-detail .sx-btn', WORDS.check)],
    frame: [inSight('dialog[open]:has(.settings-detail)')],
  },
  local: {
    viewport: { width: 1280, height: 1240 },
    go: async (page) => {
      await toHome(page);
      await homeSettings(page);
      await openSettingsCard(page, WORDS.local);
      // The models to download and Ollama's own block are set aside here, so the three steps fit
      // in one picture: the model, and which projects use it.
      await page.evaluate((aside) => { for (const one of document.querySelectorAll('section.sx-block')) if (aside.some((title) => one.querySelector('h3')?.textContent.startsWith(title))) one.style.display = 'none'; }, lang === 'es' ? ['Más modelos', 'Ollama'] : ['More models', 'Ollama']);
      await settle(page);
    },
    marks: [firstInSight('.settings-detail-title'), (page) => page.locator('.sx-row', { has: page.locator('.sx-recommend') }).first(), (page) => page.locator('section.sx-block', { hasText: WORDS.projects }).locator('.sx-seg').first()],
    frame: [inSight('dialog[open]:has(.settings-detail)')],
  },
  coordinator: {
    viewport: { width: 1280, height: 820 },
    go: toHome,
    marks: ['#sm-bishop-go', '#sm-link'],
    frame: ['#sm-bishop-name', '#sm-links-tile-title', '#sm-waiting-title'],
  },
  windows: {
    viewport: { width: 1440, height: 860 },
    go: async (page) => { await toRoom(page); await openFile(page); },
    marks: ['.tool-tabs .tool-tab', `.tool-tabs .shell-key[aria-label="${WORDS.float}"]`, `.tool-tabs .shell-key[aria-label="${WORDS.close}"]`],
    place: ['below', 'below', 'left'],
    frame: [WHOLE],
  },
  settings: {
    viewport: { width: 1280, height: 860 },
    go: async (page) => { await toRoom(page); await roomSettings(page); },
    marks: [(page) => page.locator(`#chats .shell-key[aria-label="${WORDS.settingsKey}"], .side-foot .shell-key[aria-label="${WORDS.settingsKey}"]`).first(), (page) => page.locator('dialog[open] input[type=search]').last(), (page) => page.locator('dialog[open] .settings-card-head').first().locator('..')],
    frame: [WHOLE],
  },
  diagnostics: {
    viewport: { width: 1280, height: 860 },
    go: async (page) => {
      await toRoom(page);
      await page.locator('#mother-button').click();
      await settle(page);
      await page.locator('#mother-input').fill(WORDS.symptom);
      await settle(page, 900);
    },
    marks: ['#mother-button', '#mother-input', (page) => page.locator('.remedy-row:visible').first()],
    frame: ['#mother'],
  },
};

const union = (boxes) => {
  const real = boxes.filter(Boolean);
  if (!real.length) return null;
  const x = Math.min(...real.map((one) => one.x));
  const y = Math.min(...real.map((one) => one.y));
  return { x, y, width: Math.max(...real.map((one) => one.x + one.width)) - x, height: Math.max(...real.map((one) => one.y + one.height)) - y };
};
async function boxOf(page, spec) {
  if (spec === null) return null;
  if (Array.isArray(spec)) return union(await Promise.all(spec.map((one) => boxOf(page, one))));
  const found = await (typeof spec === 'function' ? spec(page) : page.locator(spec).first());
  if (!found || typeof found.boundingBox !== 'function') return found ?? null;
  return found.boundingBox({ timeout: 4000 }).catch(() => null);
}

const outDir = join(ROOT, 'public', 'assets', 'manual', 'shots');
mkdirSync(outDir, { recursive: true });
const indexFile = join(ROOT, 'public', 'manual-shots.js');
const known = existsSync(indexFile) ? (await import(`${pathToFileURL(indexFile).href}?at=${Date.now()}`)).SHOTS : {};
known[lang] ??= {};
const scratch = join(tmpdir(), `madre-shots-${process.pid}`);
mkdirSync(scratch, { recursive: true });

const browser = await chromium.launch();
try {
  for (const [id, shot] of Object.entries(SHOTS)) {
    if (only && !only.includes(id)) continue;
    const viewport = shot.viewport ?? { width: 1280, height: 820 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce', locale: lang === 'es' ? 'es-MX' : 'en-US' });
    const page = await context.newPage();
    try {
      await shot.go(page);
      // Nothing of the computer that took the pictures: the house's folders read as a person's
      // own (~/Projects/…) and a home folder as ~.
      await page.evaluate(([home, machine]) => {
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walk.nextNode(); node; node = walk.nextNode()) {
          const said = node.nodeValue;
          const clean = said.replace(/\/(?:private\/)?(?:tmp|var)\/[^\s·]*?\/home\/Projects\//g, home).replace(/\/Users\/[^/\s·]+/g, '~').split(machine).join('MacBook-Air');
          if (clean !== said) node.nodeValue = clean;
        }
      }, [WORDS.home, MACHINE]);
      await wait(300);
      const marks = await Promise.all(shot.marks.map((one) => boxOf(page, one)));
      const missing = shot.marks.map((one, at) => (one !== null && !marks[at] ? at + 1 : null)).filter(Boolean);
      if (missing.length) console.warn(`${id}: no mark for step ${missing.join(', ')}`);
      const whole = shot.frame.includes(WHOLE);
      const frame = whole ? { x: 28, y: 28, width: viewport.width - 56, height: viewport.height - 56 } : union([...(await Promise.all(shot.frame.map((one) => boxOf(page, one)))), ...marks]);
      const pad = 28;
      const x = Math.max(0, Math.floor(frame.x - pad));
      const y = Math.max(0, Math.floor(frame.y - pad));
      const clip = { x, y, width: Math.min(viewport.width, Math.ceil(frame.x + frame.width + pad)) - x, height: Math.min(viewport.height, Math.ceil(frame.y + frame.height + pad)) - y };
      // The whole window, cut afterwards: a clipped capture draws the glass's blur from a mirror of
      // its own edge (headless Chromium), and the room is all glass.
      const png = join(scratch, `${id}.png`);
      await page.screenshot({ path: png });
      const file = join(outDir, `${lang}-${id}.webp`);
      const wide = Math.min(clip.width * 2, 1600);
      execFileSync('cwebp', ['-quiet', '-q', '80', '-crop', String(clip.x * 2), String(clip.y * 2), String(clip.width * 2), String(clip.height * 2), '-resize', String(wide), '0', png, '-o', file]);
      const share = (value, of) => Math.round((value / of) * 1000) / 10;
      known[lang][id] = {
        width: wide,
        height: Math.round((clip.height / clip.width) * wide),
        marks: marks.map((one, at) => (one ? [share(one.x - clip.x, clip.width), share(one.y - clip.y, clip.height), share(one.width, clip.width), share(one.height, clip.height), ...(shot.place?.[at] ? [shot.place[at]] : [])] : null)),
      };
      console.log(`${file} · ${Math.round(statSync(file).size / 1024)} KB`);
    } catch (error) {
      console.error(`${id}: ${error.message.split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  rmSync(scratch, { recursive: true, force: true });
}

const ordered = Object.fromEntries(['es', 'en'].filter((one) => known[one]).map((one) => [one, Object.fromEntries(Object.keys(SHOTS).filter((id) => known[one][id]).map((id) => [id, known[one][id]]))]));
writeFileSync(indexFile, `// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Written by scripts/manual-shots.mjs: the size of each picture of the manual and where its marks
// stand — [left, top, width, height] in hundredths of the picture, one per step. Not edited by hand.

export const SHOTS = {
${Object.entries(ordered).map(([one, shots]) => `  ${one}: {\n${Object.entries(shots).map(([id, shot]) => `    ${id}: ${JSON.stringify(shot)},`).join('\n')}\n  },`).join('\n')}
};
`);
console.log(indexFile);
