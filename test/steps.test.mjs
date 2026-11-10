// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What an agent is doing, step by step (src/adapters/steps.mjs): read from what each CLI already
// says while it works, the same short list for every agent, nothing guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { claudeSteps, codexSteps, cursorSteps, geminiSteps, grokSteps, openCodeSteps } from '../src/adapters/steps.mjs';

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

// The shapes below are what each CLI wrote or emits (2026-11-09): Grok and OpenCode in a real turn,
// Gemini and Cursor as their installed code writes them (src/adapters/steps.mjs).
test('Grok: its own tool names in Claude\'s stream', () => {
  const events = [{ type: 'assistant', message: { content: [
    { type: 'thinking', thinking: 'Voy a leer.' },
    { type: 'tool_use', name: 'read_file', input: { target_file: '/p/hola.txt' } },
    { type: 'tool_use', name: 'grep', input: { pattern: 'pan', path: '/p' } },
    { type: 'tool_use', name: 'list_dir', input: { target_directory: '/p/src' } },
    { type: 'tool_use', name: 'run_terminal_cmd', input: { command: 'npm test' } },
  ] } }];
  assert.deepEqual(grokSteps(events, { root: '/p' }), [
    { kind: 'think', what: null }, { kind: 'read', what: 'hola.txt' }, { kind: 'search', what: 'pan' }, { kind: 'read', what: 'src' }, { kind: 'run', what: 'npm test' },
  ]);
});

test('Gemini: each tool as it calls it, a subagent left to its own card', () => {
  const lines = [
    { type: 'init', model: 'auto' },
    { type: 'tool_use', tool_name: 'read_file', tool_id: 'a', parameters: { file_path: '/p/hola.txt' } },
    { type: 'tool_use', tool_name: 'grep_search', tool_id: 'b', parameters: { pattern: 'pan' } },
    { type: 'tool_use', tool_name: 'invoke_agent', tool_id: 'c', parameters: { prompt: 'x' } },
    { type: 'tool_use', tool_name: 'replace', tool_id: 'd', parameters: { file_path: '/p/src/a.js' } },
    { type: 'tool_use', tool_name: 'web_fetch', tool_id: 'e', parameters: { prompt: 'resume https://madre.run/manual' } },
    { type: 'message', role: 'assistant', content: 'Listo', delta: true },
  ].map((one) => JSON.stringify(one)).join('\n');
  assert.deepEqual(geminiSteps(lines, { root: '/p' }), [
    { kind: 'read', what: 'hola.txt' }, { kind: 'search', what: 'pan' }, { kind: 'edit', what: 'src/a.js' }, { kind: 'fetch', what: 'madre.run' },
  ]);
});

test('Cursor: a call once, when it starts', () => {
  const lines = [
    { type: 'thinking', subtype: 'delta', text: 'a' },
    { type: 'thinking', subtype: 'delta', text: 'b' },
    { type: 'tool_call', subtype: 'started', call_id: '1', tool_call: { readToolCall: { args: { path: '/p/hola.txt' } } } },
    { type: 'tool_call', subtype: 'completed', call_id: '1', tool_call: { readToolCall: { args: { path: '/p/hola.txt' }, result: {} } } },
    { type: 'tool_call', subtype: 'started', call_id: '2', tool_call: { globToolCall: { args: { globPattern: '**/*.js' } } } },
    { type: 'tool_call', subtype: 'started', call_id: '3', tool_call: { shellToolCall: { args: { command: 'npm test' } } } },
  ].map((one) => JSON.stringify(one)).join('\n');
  assert.deepEqual(cursorSteps(lines, { root: '/p' }), [
    { kind: 'think', what: null }, { kind: 'read', what: 'hola.txt' }, { kind: 'search', what: '**/*.js' }, { kind: 'run', what: 'npm test' },
  ]);
});

test('OpenCode: each tool once it is done, its subagents left to their cards', () => {
  const lines = [
    { type: 'step_start', part: {} },
    { type: 'tool_use', part: { tool: 'read', state: { status: 'completed', input: { filePath: '/p/hola.txt' } } } },
    { type: 'tool_use', part: { tool: 'grep', state: { status: 'completed', input: { pattern: 'pan', path: '/p' } } } },
    { type: 'tool_use', part: { tool: 'task', state: { status: 'completed', input: { description: 'x' } } } },
    { type: 'tool_use', part: { tool: 'bash', state: { status: 'completed', input: { command: 'ls' } } } },
    { type: 'text', part: { text: 'Listo' } },
  ].map((one) => JSON.stringify(one)).join('\n');
  assert.deepEqual(openCodeSteps(lines, { root: '/p' }), [
    { kind: 'read', what: 'hola.txt' }, { kind: 'search', what: 'pan' }, { kind: 'run', what: 'ls' },
  ]);
});
