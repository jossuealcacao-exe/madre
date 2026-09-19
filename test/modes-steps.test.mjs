import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { resolveScopes } from '../src/capabilities.mjs';
import { parseDirectives } from '../src/directives.mjs';
import { buildCodexArgs } from '../src/adapters/codex.mjs';
import { buildClaudeArgs } from '../src/adapters/claude.mjs';
import { geminiLeasePolicy } from '../src/adapters/gemini.mjs';
import { leaseConfig } from '../src/adapters/opencode.mjs';

const gitInit = (cwd) => new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd }, (error) => (error ? reject(error) : resolve())));

test('scopes: MAX MODE and DEFAULT MODE are the two controls; older flags still read', () => {
  const codex = resolveScopes('codex');
  assert.deepEqual([codex.maxMode, codex.defaultMode, codex.write.enabled, codex.write.always], [2, 1, true, false], 'a writable CLI starts capped at #2, messages start at #1');
  assert.deepEqual([resolveScopes('codex', { maxMode: 1 }).write.enabled, resolveScopes('codex', { maxMode: 1 }).defaultMode], [false, 1], 'capped at #1: never writes, default stays #1');
  assert.deepEqual([resolveScopes('codex', { maxMode: 3, defaultMode: 2 }).write.always, resolveScopes('codex', { maxMode: 3, defaultMode: 2 }).defaultMode], [true, 2]);
  assert.equal(resolveScopes('codex', { maxMode: 3, defaultMode: 3 }).defaultMode, 2, 'a message never starts in CONTROL');
  assert.equal(resolveScopes('codex', { write: false, maxMode: 3 }).maxMode, 1, 'an old write:false reads as a #1 ceiling');
  assert.equal(resolveScopes('codex', { alwaysCreate: true }).defaultMode, 2, 'an old alwaysCreate reads as DEFAULT MODE #2');
  assert.equal(resolveScopes('madre', { maxMode: 3, defaultMode: 2 }).maxMode, 1, 'an agent whose CLI cannot write is capped at #1 whatever the config says');
  assert.deepEqual(parseDirectives('```pulse\n@codex #2: make the page\n@gemini: read it\n@claude #3: fix the router\n```', { self: 'opencode', available: ['codex', 'gemini', 'claude'] }).steps, [
    { agent: 'codex', text: 'make the page', mode: 2 }, { agent: 'gemini', text: 'read it' }, { agent: 'claude', text: 'fix the router', mode: 3 },
  ]);
});

test('plan steps carry the mode the orchestrator asked for, capped by the human and by each agent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-steps-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-steps-log-'));
  try {
    await gitInit(root);
    await writeFile(join(root, 'README.md'), 'v1\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = ['codex', 'claude', 'gemini'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = [];
    const invokers = {
      'codex-readonly': async ({ prompt, lease }) => {
        seen.push(['codex', lease ? (lease.control ? 'control' : lease.create ? 'create' : 'lease') : 'read-only']);
        if (/this is your closing turn/.test(prompt)) return { text: 'done', usage: null };
        return { text: 'Plan.\n\n```pulse\n@claude #2: add docs/plan.md\n@gemini #3: rewrite README\n@codex: summarise\n```', usage: null };
      },
      'claude-readonly': async ({ lease }) => {
        seen.push(['claude', lease ? (lease.control ? 'control' : lease.create ? 'create' : 'lease') : 'read-only']);
        if (lease?.create) { await writeFile(join(root, 'plan.md'), 'the plan\n'); await writeFile(join(root, 'README.md'), 'claude touched it\n'); }
        return { text: 'added plan.md', usage: null };
      },
      'gemini-readonly': async ({ lease }) => {
        seen.push(['gemini', lease ? (lease.control ? 'control' : lease.create ? 'create' : 'lease') : 'read-only']);
        if (lease?.control) await writeFile(join(root, 'README.md'), 'v2 by gemini\n');
        return { text: 'rewrote README', usage: null };
      },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    room.setScopes({ codex: { maxMode: 3 }, claude: { maxMode: 2 }, gemini: { maxMode: 3 } });

    // The human is in #3: the orchestrator's word decides each step's mode.
    await room.send({ text: 'organise the release', target: 'codex', mode: 3 });
    let events = await store.readAll();
    const plan = events.find((event) => event.type === 'plan.created');
    assert.equal(plan.payload.mode, 3, 'the plan ceiling is the human mode');
    assert.deepEqual(plan.payload.steps.map((step) => step.mode), [2, 3], 'each step at the mode it asked for');
    assert.deepEqual(seen, [['codex', 'control'], ['claude', 'create'], ['gemini', 'control'], ['codex', 'read-only']], 'orchestrator in CONTROL, #2 step with a project lease, #3 step in CONTROL, closing turn read-only');
    assert.ok(events.some((event) => event.type === 'lease.granted' && event.payload.delegated && event.payload.agent === 'claude' && event.payload.grantedBy === 'codex'));
    assert.equal(events.filter((event) => event.type === 'control.started').length, 2, 'codex and then gemini each held CONTROL');
    assert.equal(await readFile(join(root, 'plan.md'), 'utf8'), 'the plan\n', 'the #2 step added its file');
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'v2 by gemini\n', "the #2 step's edit of README was put back, the #3 step's edit stayed");
    assert.ok(events.some((event) => event.type === 'create.reverted' && event.payload.agent === 'claude' && event.payload.existing.includes('README.md')));

    // The same plan under a #1 message: #2 and #3 are asked for, nobody gets them without the human.
    seen.length = 0;
    const quiet = await new EventStore(join(logDir, 'quiet.jsonl')).initialize();
    const room2 = new Room({ store: quiet, agents, projectRoot: root, invokers: { ...invokers, 'codex-readonly': async ({ prompt }) => (/this is your closing turn/.test(prompt) ? { text: 'done', usage: null } : { text: 'Plan.\n\n```pulse\n@gemini #3: rewrite README\n@codex: summarise\n```', usage: null }) }, escalationMs: 300 });
    room2.setScopes({ codex: { maxMode: 3 }, gemini: { maxMode: 3 } });
    await room2.send({ text: 'organise the release', target: 'codex', mode: 1 });
    events = await quiet.readAll();
    assert.equal(events.find((event) => event.type === 'plan.created').payload.mode, 1);
    assert.deepEqual(events.find((event) => event.type === 'plan.created').payload.steps.map((step) => step.mode), [1], 'a #3 request under a #1 message is capped at #1');
    assert.equal(events.filter((event) => event.type === 'control.started').length, 0);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'v2 by gemini\n', 'nothing changed');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(logDir, { recursive: true, force: true });
  }
});


test('#4 AIRLOCK: CONTROL plus commands, one holder, only where the ceiling reaches it; each CLI gets its command tool only there', async () => {
  assert.equal(resolveScopes('codex', { maxMode: 4 }).maxMode, 4);
  assert.equal(resolveScopes('codex').maxMode, 2, 'the default ceiling stays #2');
  const control = { leaseId: 'c', outDir: '/p', relativeDir: '.', scopes: { write: true }, control: true, airlock: false };
  const airlock = { ...control, airlock: true };
  assert.equal(buildCodexArgs({ projectRoot: '/p', prompt: 'q', lease: control })[1], 'workspace-write');
  assert.equal(buildCodexArgs({ projectRoot: '/p', prompt: 'q', lease: airlock })[1], 'danger-full-access');
  const claudeControl = buildClaudeArgs({ prompt: 'q', lease: control }); const claudeAirlock = buildClaudeArgs({ prompt: 'q', lease: airlock });
  assert.ok(!claudeControl[claudeControl.indexOf('--tools') + 1].includes('Bash') && claudeAirlock[claudeAirlock.indexOf('--tools') + 1].includes('Bash'));
  assert.ok(claudeAirlock[claudeAirlock.indexOf('--allowedTools') + 1].split(',').includes('Bash'));
  assert.ok(!/toolName = "run_shell_command"\ndecision = "allow"/.test(geminiLeasePolicy('/p', { control: true })) && /toolName = "run_shell_command"\ndecision = "allow"/.test(geminiLeasePolicy('/p', { control: true, airlock: true })));
  assert.equal(leaseConfig('/p', { control: true, relativeDir: '.' }).agent['pulse-readonly'].permission.bash, undefined);
  assert.equal(leaseConfig('/p', { control: true, airlock: true, relativeDir: '.' }).agent['pulse-readonly'].permission.bash, 'allow');

  const root = await mkdtemp(join(tmpdir(), 'pulse-airlock-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-airlock-log-'));
  try {
    await writeFile(join(root, 'README.md'), 'v1\n');   // no git: the shadow repository photographs it
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = ['opencode', 'codex'].map((id) => ({ id, label: id, detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const seen = [];
    const invokers = {
      'opencode-readonly': async ({ prompt, lease }) => { seen.push(['opencode', lease?.airlock ? 'airlock' : lease?.control ? 'control' : 'other']); assert.match(prompt, /AIRLOCK \(#4\)[\s\S]*what goes out and where/); await writeFile(join(root, 'deploy.log'), 'deployed\n'); return { text: 'ran the deploy', usage: null }; },
      'codex-readonly': async ({ lease }) => { seen.push(['codex', lease?.airlock ? 'airlock' : lease?.control ? 'control' : 'other']); return { text: 'ok', usage: null }; },
    };
    const room = new Room({ store, agents, projectRoot: root, invokers });
    assert.equal((await room.modeCheck({ target: 'opencode', text: 'x', mode: 4 })).status, 403, 'capped at #2: no airlock');
    room.setScopes({ opencode: { maxMode: 3 } });
    assert.match((await room.modeCheck({ target: 'opencode', text: 'x', mode: 4 })).error, /raise its MAX MODE to #4 in CONNECTIONS to arm AIRLOCK/);
    room.setScopes({ opencode: { maxMode: 4 }, codex: { maxMode: 4 } });
    assert.equal((await room.modeCheck({ target: 'opencode', text: 'x', mode: 4 })).ok, true, 'no git repository is not an obstacle any more');
    await room.send({ text: 'deploy to preview', target: 'opencode', mode: 4 });
    const events = await store.readAll();
    assert.deepEqual(seen, [['opencode', 'airlock']]);
    const started = events.find((event) => event.type === 'control.started');
    assert.equal(started.payload.mode, 4);
    assert.match(started.payload.message, /holds AIRLOCK/);
    assert.equal(events.find((event) => event.type === 'message.created' && event.payload.role === 'user').payload.mode, 4);
    assert.equal(events.find((event) => event.type === 'message.created' && event.payload.sender === 'opencode').payload.mode, 4);
    const changed = events.find((event) => event.type === 'control.changed');
    assert.deepEqual(changed.payload.files.map((file) => file.path), ['deploy.log'], 'files are still photographed and listed');
    assert.equal(room.control(), null, 'the seat is free again');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(logDir, { recursive: true, force: true });
  }
});
