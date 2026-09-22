// Rebuilds the frozen prompts in test/fixtures/prompt-golden.json.
//
// Run it only when the words an agent reads are meant to change, never to make a failing test
// pass: the point of the fixture is that moving a prompt is a decision, not a side effect. It
// lives outside test/ because everything under there is run as a test.
//
//   node scripts/build-prompt-golden.mjs

import { writeFile } from 'node:fs/promises';
import { buildPrompt } from '../src/room/prompt.mjs';

const agent = { id: 'codex' };
const others = [{ id: 'claude' }, { id: 'gemini' }, { id: 'madre' }];
const context = { messages: [{}, {}], omittedMessages: 3, text: 'irrelevant' };
const shapes = {
  bare: { agent, text: 'hola', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 1 },
  loaded: {
    agent, text: 'revisa el router', requester: 'you', depth: 0, allowDelegation: true, context, others, mode: 2,
    memoryServer: { name: 'pulse-memory' }, madreModel: 'madre-pulse:latest',
    sdk: { guide: 'docs/SDK.md', example: 'docs/sdk/hello-module.mjs' },
    lease: { outDir: '.pulse/out', scopes: { web: true }, create: true, scratchDir: 'turn-1' },
    scopes: { web: true }, scopesFor: () => ({ web: true }), maxPlanSteps: 4,
    memories: [{ kind: 'fact', text: 'Una memoria.', fromSequence: 1, throughSequence: 2 }],
    recall: { entries: [{ sequence: 4, sender: 'codex', role: 'assistant', text: 'Una cita.' }] },
    mcpServers: [{ name: 'playwright', brief: 'a browser' }],
    motherLines: [{ at: '12:00', kind: 'limit', text: 'algo' }],
    attachments: [{ path: 'a.png', contentType: 'image/png', size: 10 }],
    references: [{ path: 'src/x.mjs', contentType: 'text/plain', size: 20, lines: { from: 1, to: 3 } }],
  },
  ghost: { agent, text: 'secreto', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 0 },
  delegated: { agent, text: 'haz el paso', requester: 'codex', depth: 1, allowDelegation: false, context, others: [], mode: 1, sharedLeaseHint: 'comparten el lease' },
  mother: { agent, text: 'atencion', requester: 'mother', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [], mode: 1 },
  control: { agent, text: 'arregla', requester: 'you', depth: 0, allowDelegation: false, context, others: [], mode: 3, lease: { outDir: '.pulse/out', scopes: {}, control: true }, controlHolder: 'claude', escalation: 'declined' },
  airlock: { agent, text: 'despliega', requester: 'you', depth: 0, allowDelegation: false, context, others: [], mode: 4, lease: { outDir: '.pulse/out', scopes: {}, airlock: true } },
};
const golden = {};
for (const [name, opts] of Object.entries(shapes)) golden[name] = buildPrompt(opts);
await writeFile(new URL('../test/fixtures/prompt-golden.json', import.meta.url), `${JSON.stringify(golden, null, 2)}\n`);
console.log('congelados:', Object.entries(golden).map(([k, v]) => `${k} ${v.length}`).join(' · '));
