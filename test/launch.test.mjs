import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { redactArgs, HIDDEN } from '../src/launch.mjs';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');
const agents = [
  { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/usr/local/bin/codex', version: '1' },
  { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/usr/local/bin/claude', version: '1' },
  { id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/usr/local/bin/gemini', version: '1' },
  { id: 'madre', label: 'MADRE', detected: true, ready: true, adapter: 'madre-local', local: true, version: 'qwen2.5:7b' },
];

test('launch: environment values are hidden whatever shape the adapter wrote them in', () => {
  const args = redactArgs([
    '--sandbox', 'read-only',
    '-c', 'mcp_servers.pulse-memory.env={ PULSE_MEMORY_DB = "/home/someone/.pulse/memory.sqlite", GEMINI_API_KEY = "sk-live-4411" }',
    '--mcp-config', '{"mcpServers":{"studio":{"command":"node","env":{"GEMINI_API_KEY":"sk-live-4411"}}}}',
    'ANTHROPIC_AUTH_TOKEN=sk-live-4411',
    'PATH=/usr/bin',
  ]);
  const whole = args.join(' ');
  assert.ok(!whole.includes('sk-live-4411'), 'a key reached the screen');
  assert.ok(!whole.includes('/home/someone/.pulse/memory.sqlite'), 'an environment value reached the screen');
  // The names stay, because knowing which variables are set is the useful half.
  assert.match(whole, /PULSE_MEMORY_DB/);
  assert.match(whole, /GEMINI_API_KEY/);
  assert.match(whole, /ANTHROPIC_AUTH_TOKEN=/);
  assert.equal(args.filter((arg) => arg.includes(HIDDEN)).length, 3, 'exactly the three arguments that carried values are the ones redacted');
  // Everything that is not a value is untouched: the command is shown as it would run.
  assert.equal(args[0], '--sandbox');
  assert.equal(args[1], 'read-only');
  assert.equal(args.at(-1), 'PATH=/usr/bin', 'an ordinary variable was hidden as if it were a secret');
  assert.deepEqual(JSON.parse(args[5]).mcpServers.studio.command, 'node');
});

test('launch: the core prints the command that would run, and printing it runs nothing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-launch-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    const before = await readdir(root);

    const claude = await room.launch({ agent: 'claude', mode: 1 });
    assert.equal(claude.executable, '/usr/local/bin/claude');
    assert.equal(claude.cwd, root);
    assert.ok(claude.args.length > 0);
    // The briefing itself is not repeated here: the document above is the briefing, and this is
    // where it would go.
    assert.ok(claude.args.includes(claude.promptMarker), 'the command does not say where the briefing goes');
    assert.match(claude.promptMarker, /briefing above/);
    // A read-only turn is read-only in the flags, which is the point of showing them.
    assert.match(claude.args.join(' '), /--permission-mode/);
    assert.ok(claude.isolation.length > 0, 'nothing is said about what keeps the run to this turn');

    // Gemini is given a home of its own, and its names are shown without their values.
    const gemini = await room.launch({ agent: 'gemini', mode: 1 });
    assert.deepEqual(gemini.env.map((one) => one.name), ['GEMINI_CLI_HOME', 'GEMINI_CLI_NO_RELAUNCH']);
    for (const one of gemini.env) assert.ok(one.note && !('value' in one), `${one.name} carries a value`);

    // Codex writes its servers into the command line; no value of theirs is printed.
    const codex = await room.launch({ agent: 'codex', mode: 1 });
    assert.ok(!codex.args.some((arg) => /env=\{[^}]*"/.test(arg)), 'an environment value is printed in the command');

    // Nothing is a process, a lease or a file: looking at the launch leaves no trace of a turn.
    assert.deepEqual((await readdir(root)).sort(), before.sort(), 'showing the command left something on disk');
    assert.equal(await room.launch({ agent: 'nobody' }), null);

    // The local model is not a process at all, and the core says so rather than inventing one.
    const local = await room.launch({ agent: 'madre', mode: 1 });
    assert.equal(local.local, true);
    assert.equal(local.executable, undefined);
    assert.match(local.says, /No process is started/);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('launch: the floor under the document shows the command, the isolation and the servers', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /doc\.append\(renderCoreLaunch\(briefing\.launch \?\? null\)\)/);
  assert.match(app, /WHAT MADRE WOULD RUN TO DELIVER IT/);
  assert.match(app, /WHAT KEEPS IT TO THIS TURN/);
  assert.match(app, /NAMES ONLY\. NO VALUE IS EVER SHOWN HERE\./);
  assert.match(app, /SERVERS IT CAN CALL/);
  assert.match(app, /NOTHING IS RUN FROM HERE/);
  assert.match(css, /\.core-launch \{/);
});
