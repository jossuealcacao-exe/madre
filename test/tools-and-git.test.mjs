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
