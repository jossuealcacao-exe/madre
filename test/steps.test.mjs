// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What an agent is doing, step by step (src/adapters/steps.mjs): read from what each CLI already
// says while it works, the same short list for every agent, nothing guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { claudeSteps, codexSteps } from '../src/adapters/steps.mjs';

test('Claude: each tool it uses becomes a step, its file said from the project', () => {
  const root = '/Users/me/project';
  const events = [
    { type: 'assistant', message: { content: [{ type: 'thinking', thinking: '…' }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: `${root}/src/app.js` } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: `${root}/src/app.js` } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Grep', input: { pattern: 'price' } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: `${root}/src/cart.js` } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'WebFetch', input: { url: 'https://nodejs.org/api/fs.html' } }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'mcp__memory__recall', input: {} }] } },
    // A subagent's own steps are its own, not the turn's.
    { type: 'assistant', parent_tool_use_id: 'x', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: `${root}/secret.md` } }] } },
  ];
  assert.deepEqual(claudeSteps(events, { root }), [
    { kind: 'think', what: null },
    { kind: 'read', what: 'src/app.js' },
    { kind: 'search', what: 'price' },
    { kind: 'edit', what: 'src/cart.js' },
    { kind: 'run', what: 'npm test' },
    { kind: 'fetch', what: 'nodejs.org' },
    { kind: 'tool', what: 'recall' },
  ]);
});

test('Codex: commands, changes and searches as they start, each once', () => {
  const lines = [
    { type: 'thread.started', thread_id: 't' },
    { type: 'item.started', item: { id: '1', type: 'reasoning' } },
    { type: 'item.started', item: { id: '2', type: 'command_execution', command: "/bin/zsh -lc 'rg price src'" } },
    { type: 'item.completed', item: { id: '2', type: 'command_execution', command: "/bin/zsh -lc 'rg price src'" } },
    { type: 'item.completed', item: { id: '3', type: 'file_change', changes: [{ path: '/p/src/cart.js', kind: 'update' }] } },
    { type: 'item.started', item: { id: '4', type: 'web_search', query: 'node fs promises' } },
    { type: 'item.completed', item: { id: '5', type: 'agent_message', text: 'Listo.' } },
  ].map((one) => JSON.stringify(one)).join('\n');
  assert.deepEqual(codexSteps(lines, { root: '/p' }), [
    { kind: 'think', what: null },
    { kind: 'run', what: 'rg price src' },
    { kind: 'edit', what: 'src/cart.js' },
    { kind: 'web', what: 'node fs promises' },
  ]);
});

test('a CLI that says no steps gives none: the room keeps its phrases', () => {
  assert.deepEqual(claudeSteps([{ type: 'assistant', message: { content: [{ type: 'text', text: 'hola' }] } }]), []);
  assert.deepEqual(codexSteps('not json\n{"type":"turn.completed"}'), []);
});
