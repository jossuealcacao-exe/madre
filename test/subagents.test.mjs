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
