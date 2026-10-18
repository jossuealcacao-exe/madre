import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { defineModule } from '../src/modules/sdk.mjs';
import { MODULES, toolsForTurn, moduleById } from '../src/modules/index.mjs';
import { playwrightServerFor, PLAYWRIGHT_TOOLS } from '../src/modules/playwright.mjs';
import { buildClaudeArgs } from '../src/adapters/claude.mjs';
import { buildCodexArgs } from '../src/adapters/codex.mjs';
import { geminiPolicy, isolateGeminiSettings } from '../src/adapters/gemini.mjs';
import { openCodeConfig } from '../src/adapters/opencode.mjs';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { commandByName } from '../src/commands.mjs';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

test('sdk: a module hands tools to a turn only while it is on, and every CLI attaches them the way it knows', async () => {
  const spy = defineModule({ id: 'spy-glass', name: 'Spy Glass', toolsForTurn: async (ctx, turn) => [{ name: 'pulse-spy', command: 'node', args: ['spy.mjs'], env: { PORT: String(turn.port) }, tools: ['look'], brief: 'looks' }] });
  const ctx = { config: { modules: { spyGlass: { enabled: false } } }, env: {}, stateRoot: '/s' };
  assert.deepEqual(await spy.toolsForTurn(ctx, { port: 4317 }), [], 'off: nothing');
  const on = await spy.toolsForTurn({ ...ctx, config: { modules: { spyGlass: { enabled: true } } } }, { port: 4317 });
  assert.deepEqual(on.map((s) => [s.name, s.env.PORT]), [['pulse-spy', '4317']]);
  const broken = defineModule({ id: 'broken', name: 'Broken', toolsForTurn: async () => { throw new Error('no'); } });
  assert.deepEqual(await broken.toolsForTurn({ config: { modules: { broken: { enabled: true } } } }, {}), [], 'a failing module hands nothing and never breaks the turn');
  assert.ok(moduleById('playwright') && MODULES.some((m) => m.toolsForTurn), 'PLAYWRIGHT is registered on the hook');
  const registry = await toolsForTurn({ config: { modules: {} }, env: {}, stateRoot: '/s' }, { port: 4317, mode: 1 });
  assert.deepEqual(registry, [], 'every module off: no tools');

  const server = playwrightServerFor({ port: 4319, outputDir: '/p/.pulse/out/t' });
  assert.equal(server.name, 'pulse-playwright');
  assert.ok(server.args.includes('--isolated') && server.args.includes('--headless') && server.args[server.args.indexOf('--allowed-origins') + 1] === 'http://127.0.0.1:4319;http://localhost:4319');
  assert.match(server.brief, /reaches only this MADRE at http:\/\/127\.0\.0\.1:4319/);
  assert.deepEqual(server.tools, PLAYWRIGHT_TOOLS);

  const servers = [server];
  const claude = buildClaudeArgs({ prompt: 'q', mcpServers: servers });
  const allowed = claude[claude.indexOf('--allowedTools') + 1].split(',');
  assert.ok(allowed.includes('mcp__pulse-playwright__browser_navigate') && allowed.includes('mcp__pulse-playwright__browser_take_screenshot'));
  assert.ok(JSON.parse(claude[claude.indexOf('--mcp-config') + 1]).mcpServers['pulse-playwright'].args.includes('--isolated'));
  assert.ok(claude.includes('--setting-sources'), 'an MCP server means no safe-mode, no user setting sources');
  const codex = buildCodexArgs({ projectRoot: '/p', prompt: 'q', mcpServers: servers });
  assert.ok(codex.some((arg) => arg.startsWith('mcp_servers.pulse-playwright.command=')));
  assert.match(geminiPolicy({ mcpServers: servers }), /toolName = \["browser_navigate", "pulse-playwright__browser_navigate"/);
  assert.equal(isolateGeminiSettings({}, { mcpServers: servers }).mcpServers['pulse-playwright'].trust, true);
  const oc = openCodeConfig({ mcpServers: servers });
  assert.equal(oc.mcp['pulse-playwright'].type, 'local');
  assert.equal(oc.agent['pulse-readonly'].permission['pulse-playwright*'], 'allow');
  assert.equal(oc.agent['pulse-readonly'].permission['pulse-playwright_browser_click'], 'allow');

  // The room asks once per turn and the agent is told what it got.
  const root = await mkdtemp(join(tmpdir(), 'pulse-tools-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const seen = [];
    const room = new Room({
      store, agents: [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }], projectRoot: root,
      invokers: { 'claude-readonly': async ({ prompt, mcpServers }) => { seen.push({ prompt, mcpServers }); return { text: 'looked', usage: null }; } },
      toolsForTurn: async (turn) => [{ ...server, brief: `a browser on port ${turn.port ?? 'n/a'} for @${turn.agent} in #${turn.mode}` }],
    });
    await room.send({ text: 'open the preview', target: 'claude' });
    assert.equal(seen[0].mcpServers[0].name, 'pulse-playwright');
    assert.match(seen[0].prompt, /Tools from MADRE's modules[\s\S]*- pulse-playwright: a browser on port n\/a for @claude in #1/);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('/git commit is the human\'s hand on the tree; /git push shows what would leave and only goes with confirm', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-gitcmd-'));
  const remote = await mkdtemp(join(tmpdir(), 'pulse-gitcmd-remote-'));
  try {
    git(root, 'init', '-q', '-b', 'main');
    // A machine with no git identity gets one sentence, not git's wall of advice.
    const command0 = commandByName('git');
    await writeFile(join(root, 'README.md'), 'v1\n');
    git(root, 'config', 'user.email', '');   // deterministic: this machine may well have a global identity
    git(root, 'config', 'user.name', '');
    const nameless = await command0.execute({ projectRoot: root, args: ['commit', 'first'] });
    assert.equal(nameless.ok, false);
    assert.match(nameless.text, /no git identity[\s\S]*git config --global user\.email/);
    git(root, 'config', 'user.email', 't@t');
    git(root, 'config', 'user.name', 't');
    git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'first');
    const command = commandByName('git');
    assert.equal(await command.available({ projectRoot: root }), true);
    assert.match((await command.execute({ projectRoot: root, args: ['commit'] })).text, /Give the commit a message/);
    await writeFile(join(root, 'page.astro'), 'new\n');
    const committed = await command.execute({ projectRoot: root, args: ['commit', '"add', 'the', 'page"'] });
    assert.equal(committed.ok, true);
    assert.match(committed.text, /add the page[\s\S]*page\.astro/);
    assert.equal(git(root, 'status', '--short'), '', 'everything committed');
    const noUpstream = await command.execute({ projectRoot: root, args: ['push'] });
    assert.equal(noUpstream.ok, false);
    assert.match(noUpstream.text, /no upstream/);
    git(remote, 'init', '-q', '--bare');
    git(root, 'remote', 'add', 'origin', remote);
    git(root, 'push', '-q', '-u', 'origin', 'main');
    await writeFile(join(root, 'page.astro'), 'v2\n');
    await command.execute({ projectRoot: root, args: ['commit', 'second'] });
    const preview = await command.execute({ projectRoot: root, args: ['push'] });
    assert.match(preview.text, /would leave for origin\/main[\s\S]*second[\s\S]*\/git push confirm/);
    assert.equal(git(remote, 'log', '--oneline', 'main').split('\n').length, 2, 'the preview sent nothing');
    const pushed = await command.execute({ projectRoot: root, args: ['push', 'confirm'] });
    assert.equal(pushed.ok, true);
    assert.match(pushed.text, /sent to origin\/main/);
    assert.equal(git(remote, 'log', '--oneline', 'main').split('\n').length, 3, 'now it left');
    assert.match((await command.execute({ projectRoot: root, args: ['push'] })).text, /Nothing to push/);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(remote, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('PLAYWRIGHT: it is turned on only if its server starts with its browser, and it reaches the servers the human started', async () => {
  const { playwrightStarts } = await import('../src/modules/playwright.mjs');
  const served = playwrightServerFor({ port: 4319, outputDir: '/p/o', servers: [8123, 4319] });
  assert.equal(served.args[served.args.indexOf('--allowed-origins') + 1], 'http://127.0.0.1:4319;http://localhost:4319;http://127.0.0.1:8123;http://localhost:8123');
  assert.match(served.brief, /the project's servers the human started \(http:\/\/127\.0\.0\.1:8123\)[\s\S]*to try an app with its data, open it on its server/);

  // A server that speaks MCP; told what to answer when asked to open a page.
  const root = await mkdtemp(join(tmpdir(), 'pulse-pw-check-'));
  try {
    const fake = join(root, 'server.mjs');
    await writeFile(fake, `
      import { createInterface } from 'node:readline';
      const mode = process.argv[2];
      if (mode === 'dies') { console.error('npm ERR! could not determine executable to run'); process.exit(1); }
      const say = (message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\\n');
      createInterface({ input: process.stdin }).on('line', (line) => {
        const message = JSON.parse(line);
        if (message.method === 'initialize') say({ id: message.id, result: { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fake' } } });
        if (message.method === 'tools/call') say({ id: message.id, result: mode === 'nobrowser'
          ? { isError: true, content: [{ type: 'text', text: 'Error: Browser "chromium" is not installed. Run npx @playwright/mcp install-browser.' }] }
          : { content: [{ type: 'text', text: 'Navigated to about:blank' }] } });
      });
    `);
    const run = (mode) => playwrightStarts({ command: process.execPath, args: [fake, mode], timeoutMs: 8000 });
    assert.deepEqual(await run('ok'), { ok: true, checked: true });
    const missing = await run('nobrowser');
    assert.equal(missing.ok, false);
    assert.match(missing.problem, /Browser "chromium" is not installed/);
    const dead = await run('dies');
    assert.equal(dead.ok, false);
    assert.match(dead.problem, /could not determine executable to run/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a tool server costs only where it is used: the browser rides on turns that ask for one, with only the tools the room allows', async () => {
  const { wantsBrowser } = await import('../src/modules/playwright.mjs');
  for (const asked of ['Abre la app en el navegador y toma una captura', '¿Cómo se ve en móvil?', 'Revisa la consola de la vista previa', 'Pruébalo en el navegador', 'take a screenshot of the page', 'click through the form']) assert.ok(wantsBrowser(asked), asked);
  for (const asked of ['Cambia el lema de la página a «Tus gastos»', 'Crea el archivo README.md', 'Explica app.js', 'fix the parser']) assert.ok(!wantsBrowser(asked), asked);
  const server = playwrightServerFor({ port: 4319, outputDir: '/p/o' });
  const codex = buildCodexArgs({ projectRoot: '/p', prompt: 'q', mcpServers: [server] });
  assert.ok(codex.includes(`mcp_servers.pulse-playwright.enabled_tools=[${PLAYWRIGHT_TOOLS.map((tool) => JSON.stringify(tool)).join(', ')}]`), 'Codex was handed every tool the server lists');
  assert.deepEqual(isolateGeminiSettings({}, { mcpServers: [server] }).mcpServers['pulse-playwright'].includeTools, PLAYWRIGHT_TOOLS);
  // And the economy sets turns with a server against the same agent's turns without it.
  const { economy } = await import('../src/room/economy.mjs');
  const turn = (input, servers) => ({ type: 'turn.cost', payload: { agent: 'codex', input, output: 10, cached: 0, chars: 100, blocks: {}, servers } });
  const read = economy([turn(500000, ['pulse-memory', 'pulse-playwright']), turn(300000, ['pulse-memory', 'pulse-playwright']), turn(60000, ['pulse-memory']), turn(40000, ['pulse-memory'])]);
  assert.deepEqual(read.servers, [{ agent: 'codex', server: 'pulse-playwright', with: 2, without: 2, medianWith: 400000, medianWithout: 50000 }]);
});

test('PLAYWRIGHT already on: a browser that does not start is said on its card and handed to no turn', async () => {
  const { playwrightHealth, forgetPlaywrightHealth } = await import('../src/modules/playwright.mjs');
  forgetPlaywrightHealth();
  let asked = 0;
  const check = async () => { asked += 1; return { ok: false, problem: 'Browser "chrome-for-testing" is not installed' }; };
  assert.equal(playwrightHealth({ env: {}, check }), null, 'the first look answers at once and asks in the background');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(playwrightHealth({ env: {}, check }), { ok: false, problem: 'Browser "chrome-for-testing" is not installed' });
  assert.equal(asked, 1, 'asked again before ten minutes passed');
  const module = moduleById('playwright');
  const turn = await module.toolsForTurn({ env: process.env, projectRoot: '/p', settings: { enabled: true, browser: 'chromium' } }, { mode: 1, text: 'abre la página en el navegador', port: 4319 }).catch(() => null);
  if (turn) assert.deepEqual(turn, [], 'a browser known not to start was handed to a turn');
  forgetPlaywrightHealth();
});

test('PLAYWRIGHT: the answer belongs to the browser it was asked about, and the remedy names that browser', async () => {
  const { playwrightHealth, forgetPlaywrightHealth, installBrowserLine } = await import('../src/modules/playwright.mjs');
  forgetPlaywrightHealth();
  const asked = [];
  const check = async ({ browser }) => { asked.push(browser); return browser === 'webkit' ? { ok: false, problem: 'Browser "webkit" is not installed' } : { ok: true, checked: true }; };
  playwrightHealth({ env: {}, check, browser: 'chromium' });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(playwrightHealth({ env: {}, check, browser: 'chromium' }), { ok: true, checked: true });
  // Chosen another engine, the room asks again instead of riding on chromium's answer.
  assert.equal(playwrightHealth({ env: {}, check, browser: 'webkit' }), null);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(playwrightHealth({ env: {}, check, browser: 'webkit' })?.ok, false);
  assert.deepEqual(asked, ['chromium', 'webkit']);
  assert.equal(installBrowserLine('webkit'), 'npx @playwright/mcp install-browser webkit');
  assert.equal(installBrowserLine('chromium'), 'npx @playwright/mcp install-browser chromium');
  assert.equal(installBrowserLine('nope'), 'npx @playwright/mcp install-browser chromium');
  forgetPlaywrightHealth();
});

// The test browser fetches what it is missing when it is turned on (2026-10-18): the server when it
// is not there, then the browser the server downloads, and it is asked again — no terminal.
test('test browser · turned on, MADRE installs the missing server and browser, then asks again', async () => {
  const { preparePlaywright } = await import('../src/modules/playwright.mjs');
  const ran = [];
  let server = null;
  const run = async (command, args) => { ran.push([command, ...args].join(' ')); if (command === 'npm') server = '0.0.70'; return { code: 0, said: null }; };
  const ready = await preparePlaywright({ browser: 'chromium', run, version: async () => server, starts: async () => ({ ok: true, checked: true }) });
  assert.equal(ready.ok, true);
  assert.deepEqual(ran, ['npm install -g @playwright/mcp', 'npx --no @playwright/mcp install-browser chromium']);
  // With the server there, only the browser; an unknown engine falls back to chromium.
  ran.length = 0;
  await preparePlaywright({ browser: 'webkit', run, version: async () => '0.0.70', starts: async () => ({ ok: true }) });
  assert.deepEqual(ran, ['npx --no @playwright/mcp install-browser webkit']);
  // Still not starting: it says so, with the reason, and turns nothing on.
  const still = await preparePlaywright({ run, version: async () => '0.0.70', starts: async () => ({ ok: false, problem: 'no network' }) });
  assert.deepEqual([still.ok, still.problem], [false, 'no network']);
  // The server could not be installed: the browser is not even tried.
  ran.length = 0;
  const noServer = await preparePlaywright({ run: async (command, args) => { ran.push(command); return { code: 1, said: 'EACCES' }; }, version: async () => null, starts: async () => ({ ok: true }) });
  assert.deepEqual([noServer.ok, noServer.problem, ran], [false, 'EACCES', ['npm']]);
});

test('test browser · npm\'s reason is the line that says why, never the one pointing at its log', async () => {
  const { npmReason } = await import('../src/modules/playwright.mjs');
  const said = ['npm error code ENOENT', 'npm error syscall open', 'npm error path /Users/a/tester/madre.tgz', 'npm error enoent ENOENT: no such file or directory, open \'/Users/a/tester/madre.tgz\'', 'npm error A complete log of this run can be found in: /Users/a/.npm/_logs/x.log'].join('\n');
  assert.equal(npmReason(said), "enoent ENOENT: no such file or directory, open '/Users/a/tester/madre.tgz'");
  assert.equal(npmReason('Error: Browser "chromium" is not installed'), 'Error: Browser "chromium" is not installed');
});
