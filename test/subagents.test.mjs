import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaudeArgs, claudeTools } from '../src/adapters/claude.mjs';
import { buildCodexArgs } from '../src/adapters/codex.mjs';
import { openCodeConfig, SUBAGENTS } from '../src/adapters/opencode.mjs';
import { leaseInstructions, subagentsAllowed } from '../src/lease.mjs';

// The CLIs' own subagents (2026-10-29): from #1 to #3 Claude, OpenCode and Codex may use theirs, each
// with exactly the permissions of the turn; in #4 only the agent itself works. Gemini's stay refused.
// Each rule here was first tried against the real CLI (Claude 2.1.267, OpenCode 1.18.4, Codex 0.161).
const MODES = {
  1: null,
  2: { outDir: '/p', create: true, relativeDir: '.' },
  3: { outDir: '/p', control: true, relativeDir: '.' },
  4: { outDir: '/p', control: true, airlock: true, relativeDir: '.' },
};
const flag = (args, name) => args[args.indexOf(name) + 1];

test('subagents · Claude gets its Agent tool from #1 to #3, allowed, and never in #4', () => {
  for (const mode of [1, 2, 3]) {
    const lease = MODES[mode];
    assert.ok(claudeTools({ lease }).includes('Agent'), `#${mode} without Agent`);
    const args = buildClaudeArgs({ prompt: 'p', lease });
    assert.ok(flag(args, '--tools').split(',').includes('Agent'));
    // Under dontAsk a tool missing from --allowedTools is refused, so the list carries it too.
    if (args.includes('--allowedTools')) assert.ok(flag(args, '--allowedTools').split(',').includes('Agent'), `#${mode} Agent not allowed`);
  }
  assert.equal(claudeTools({ lease: MODES[4] }).includes('Agent'), false, 'Agent in #4');
  const four = buildClaudeArgs({ prompt: 'p', lease: MODES[4] });
  assert.equal(flag(four, '--tools').split(',').includes('Agent'), false);
  assert.equal(flag(four, '--allowedTools').split(',').includes('Agent'), false);
});

test('subagents · OpenCode may call explore and general only, each with exactly the turn\'s permissions', () => {
  for (const mode of [1, 2, 3]) {
    const config = openCodeConfig({ lease: MODES[mode], scopes: { web: true }, memoryServer: { name: 'pulse-memory', tools: ['memory_search'], command: 'node', args: [] } });
    const main = config.agent['pulse-readonly'];
    assert.deepEqual(main.permission.task, { '*': 'deny', explore: 'allow', general: 'allow' }, `#${mode}`);
    assert.match(main.prompt, /other than explore and general/);
    for (const name of SUBAGENTS) {
      // Not OpenCode's own defaults: its general writes and runs commands out of the box.
      const { task, ...rest } = config.agent[name].permission;
      const { task: _, ...mainRest } = main.permission;
      assert.equal(task, 'deny', `${name} may call another subagent`);
      assert.deepEqual(rest, mainRest, `${name} in #${mode} has other permissions than the agent`);
    }
  }
  // #1: the subagents read and nothing else.
  const one = openCodeConfig({}).agent.general.permission;
  assert.deepEqual([one['*'], one.read, one.edit, one.write, one.bash], ['deny', 'allow', undefined, undefined, undefined]);
  // #3: the forbidden zones are closed to the subagents as to the agent.
  const three = openCodeConfig({ lease: MODES[3] }).agent.general.permission;
  assert.equal(three.write['.pulse/**'], 'deny');
  assert.equal(three.edit['.git/**'], 'deny');
  // #4: no subagent at all.
  const four = openCodeConfig({ lease: MODES[4] });
  assert.equal(four.agent.general, undefined);
  assert.equal(four.agent['pulse-readonly'].permission.task, undefined);
  assert.equal(four.agent['pulse-readonly'].permission['*'], 'deny');
  assert.match(four.agent['pulse-readonly'].prompt, /Do not launch subagents\./);
});

test('subagents · Codex keeps them inside its sandbox, and in #4 has room for no thread but its own', () => {
  for (const mode of [1, 2, 3]) assert.equal(buildCodexArgs({ projectRoot: '/p', prompt: 'p', lease: MODES[mode] }).some((one) => /max_concurrent_threads/.test(one)), false, `#${mode}`);
  const four = buildCodexArgs({ projectRoot: '/p', prompt: 'p', lease: MODES[4] });
  assert.ok(four.includes('features.multi_agent_v2.max_concurrent_threads_per_session=1'));
  assert.ok(four.indexOf('features.multi_agent_v2.max_concurrent_threads_per_session=1') < four.indexOf('exec'), 'the limit has to come before exec');
});

test('subagents · what each agent is told in a turn that writes', () => {
  for (const agentId of ['claude', 'opencode', 'codex']) {
    for (const mode of [2, 3]) {
      assert.equal(subagentsAllowed(agentId, MODES[mode]), true);
      assert.match(leaseInstructions({ agentId, ...MODES[mode] }), /own subagents may help/);
    }
    assert.equal(subagentsAllowed(agentId, MODES[4]), false);
    assert.match(leaseInstructions({ agentId, ...MODES[4] }), /in AIRLOCK \(#4\) only you work/);
  }
  for (const agentId of ['gemini', 'cursor']) {
    assert.equal(subagentsAllowed(agentId, MODES[3]), false);
    assert.match(leaseInstructions({ agentId, ...MODES[3] }), /Do this work yourself/);
  }
});

// What each CLI said, recorded from the real ones (Claude 2.1.267 stream-json, OpenCode 1.18.4,
// Codex 0.161 exec --json), with the project's path written /p.
import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { claudeProgress, parseClaudeOutput } from '../src/adapters/claude.mjs';
import { parseOpenCodeOutput } from '../src/adapters/opencode.mjs';
import { CODEX_SUBAGENT_NOTE, parseCodexOutput } from '../src/adapters/codex.mjs';
import { keptSubagents } from '../src/adapters/subagents.mjs';
const recorded = (name) => readFileSync(joinPath(import.meta.dirname, 'fixtures', 'subagents', name), 'utf8');

test('subagents · Claude streams its answer, its subagents, and two answers when they ran in the background', () => {
  const output = recorded('claude-stream.jsonl');
  const said = parseClaudeOutput(output, { root: '/p' });
  // The last answer, not the one written while the subagent was still working.
  assert.equal(said.text, 'The Pro price of 499 pesos is defined in `precios.md`.');
  // Every answer's tokens, summed; the cost as Claude counts it, once.
  assert.equal(said.usage.outputTokens, 309 + 72);
  assert.equal(said.usage.cachedInputTokens, 10206 + 10805);
  assert.equal(said.usage.costUsd, 0.042633700000000004);
  assert.equal(said.usage.source, 'claude-json');
  assert.equal(said.subagents.length, 1);
  const [one] = said.subagents;
  assert.deepEqual([one.kind, one.task, one.status, one.reads, one.searches, one.changed], ['Explore', 'Find Pro price location and value', 'done', 1, 9, []]);
  assert.ok(one.seconds > 0);
  assert.match(one.report, /499 pesos/);
  // The project's paths, said from the project.
  assert.doesNotMatch(one.report, /\/p\//);
  assert.match(one.report, /`precios\.md`/);
  // While it runs: a chip as soon as the subagent is asked for, before it says anything.
  const early = output.split('\n').slice(0, 6).join('\n');
  assert.deepEqual(claudeProgress(early).subagents.map((each) => each.status), ['running']);
  // The old single object is still read.
  assert.equal(parseClaudeOutput(JSON.stringify({ result: 'hi', usage: { input_tokens: 1, output_tokens: 2 } })).text, 'hi');
});

test('subagents · OpenCode says each subagent once, when it is over; Codex only that it worked with them', () => {
  const open = parseOpenCodeOutput(recorded('opencode.jsonl'), { root: '/p' });
  assert.match(open.text, /499 pesos/);
  assert.equal(open.subagents.length, 1);
  assert.deepEqual([open.subagents[0].kind, open.subagents[0].task, open.subagents[0].status, open.subagents[0].reads], ['explore', 'Find Pro price', 'done', null]);
  assert.match(open.subagents[0].report, /499 pesos/);
  assert.doesNotMatch(open.subagents[0].report, /<task|task_result|\/p\//);
  const codex = parseCodexOutput(recorded('codex.jsonl'));
  assert.equal(codex.subagents.length, 1);
  assert.deepEqual([codex.subagents[0].kind, codex.subagents[0].task, codex.subagents[0].status], [null, null, 'done']);
  // And a turn with none says none.
  assert.equal(parseCodexOutput('{"type":"item.completed","item":{"type":"agent_message","text":"hola"}}').subagents, undefined);
  assert.match(CODEX_SUBAGENT_NOTE, /never ask the subagent to inherit or fork/);
});

test('subagents · the room keeps a bounded list, each text through its privacy guard', () => {
  const kept = keptSubagents([{ id: 'x', kind: 'explore', task: 'secreto-123 en .env', status: 'weird', seconds: 3, reads: 2, searches: null, changed: Array.from({ length: 30 }, (_, i) => `f${i}.js`), report: 'r'.repeat(2000) }], { redact: (text) => text.replace(/secreto-\d+/g, '[REDACTED]') });
  assert.equal(kept[0].task, '[REDACTED] en .env');
  assert.equal(kept[0].status, 'done');
  assert.equal(kept[0].changed.length, 20);
  assert.ok(kept[0].report.length <= 2400);
  assert.equal(keptSubagents([]), undefined);
  assert.equal(keptSubagents(undefined), undefined);
});

test('one question to several agents: each gets its own turn, and the record ties them together', async () => {
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { EventStore } = await import('../src/event-store.mjs');
  const { Room } = await import('../src/room.mjs');
  const root = await mkdtemp(joinPath(tmpdir(), 'madre-together-'));
  const store = await new EventStore(joinPath(root, 'events.jsonl')).initialize();
  const agents = [
    { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' },
    { id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/fake', version: 'test' },
  ];
  const helped = [{ id: 't1', kind: 'explore', task: 'Find the price', status: 'done', seconds: 4, reads: null, searches: null, changed: [], report: '## Found\n- precios.md' }];
  const room = new Room({ store, agents, projectRoot: root, invokers: {
    'codex-readonly': async () => ({ text: 'Codex answers.', usage: null }),
    'opencode-readonly': async ({ onProgress }) => { onProgress?.({ chars: 3, subagents: helped }); return { text: 'OpenCode answers.', usage: null, subagents: helped }; },
  } });
  const live = [];
  room.subscribeLive((event) => live.push(event));
  await room.send({ text: '@codex ¿qué hace?', target: 'codex', together: 'batch-123456' });
  await room.send({ text: '@opencode ¿qué hace?', target: 'opencode', together: 'batch-123456' });
  await room.send({ text: '@codex otra', target: 'codex', together: 'no ok!' });
  const said = (await store.readAll()).filter((event) => event.type === 'message.created');
  const asked = said.filter((event) => event.payload.role === 'user');
  assert.deepEqual(asked.map((event) => [event.payload.target, event.payload.text, event.payload.together]), [['codex', '¿qué hace?', 'batch-123456'], ['opencode', '¿qué hace?', 'batch-123456'], ['codex', 'otra', undefined]]);
  // Each answer points back to its own question, and the one helped by a subagent keeps who helped.
  const answers = said.filter((event) => event.payload.role === 'assistant');
  assert.equal(answers.length, 3);
  assert.equal(answers.find((event) => event.payload.sender === 'opencode').payload.subagents[0].report, '## Found\n- precios.md');
  assert.equal(answers.find((event) => event.payload.sender === 'codex').payload.subagents, undefined);
  // And while it worked, the chips were said live, never written.
  assert.deepEqual(live.filter((event) => event.type === 'turn.subagents').map((event) => event.payload.subagents[0].kind), ['explore']);
  assert.equal(said.some((event) => event.type === 'turn.subagents'), false);
});

test('the page sends one question to every agent named at its start, and shows it once', async () => {
  const app = readFileSync(joinPath(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(app, /function leadingCrew\(text\)/);
  assert.match(app, /if \(crew\.length > 1 && state\.mode <= 2 && !draft\)/);
  assert.match(app, /const first = batch \? togetherShown\.get\(batch\) : null;/);
  // The chips and the fold are drawn from what the room said.
  assert.match(app, /case 'turn\.subagents': showHelpers\(event\); return;/);
  assert.match(app, /if \(event\.payload\.subagents\?\.length\) bubble\.append\(subagentFold\(event\.payload\.subagents, mode\)\);/);
});
