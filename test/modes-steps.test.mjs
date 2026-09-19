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
