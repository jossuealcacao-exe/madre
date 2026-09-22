import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPrompt, promptParts, PROMPT_BLOCKS } from '../src/room/prompt.mjs';

// Seven shapes of turn, frozen as they were before any of this was measured or moved. Every
// change to the economy of a prompt has to prove it changed nothing an agent reads, so these are
// compared byte for byte. Rebuild them on purpose with test/fixtures/build-golden.mjs.
const shapes = await readFile(join(import.meta.dirname, 'fixtures', 'prompt-golden.json'), 'utf8').then(JSON.parse);

const agent = { id: 'codex' };
const others = [{ id: 'claude' }, { id: 'gemini' }, { id: 'madre' }];
const context = { messages: [{}, {}], omittedMessages: 3, text: 'irrelevant' };
const given = {
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

test('prompt: what an agent reads has not moved by a single byte', () => {
  assert.deepEqual(Object.keys(given).sort(), Object.keys(shapes).sort(), 'a shape of turn is no longer covered');
  for (const [name, opts] of Object.entries(given)) {
    assert.equal(buildPrompt(opts), shapes[name], `the ${name} turn now reads differently`);
  }
});

test('prompt: it is built from named blocks, and the blocks are exactly the prompt', () => {
  for (const [name, opts] of Object.entries(given)) {
    const parts = promptParts(opts);
    // Nothing unnamed, nothing empty, nothing repeated: a block that cannot be named cannot be
    // measured, and measuring is the whole reason for taking it apart.
    for (const part of parts) {
      assert.ok(part.id, `an unnamed block in the ${name} turn`);
      assert.ok(PROMPT_BLOCKS.includes(part.id), `${part.id} is not a known block`);
      assert.ok(part.text && part.text.trim(), `${part.id} is empty in the ${name} turn`);
    }
    const ids = parts.map((part) => part.id);
    assert.equal(new Set(ids).size, ids.length, `a block appears twice in the ${name} turn`);
    // And the parts are the prompt: no block is dropped in the joining, none added.
    assert.equal(parts.map((part) => part.text).join('\n'), shapes[name], `the ${name} turn is not the sum of its blocks`);
  }
});

test('prompt: the blocks a turn cannot use are not built for it', () => {
  const bare = promptParts(given.bare).map((part) => part.id);
  // A turn with no lease, no delegation and no memory carries none of their instructions. This
  // is what makes trimming possible later: the shape of a turn already decides what it reads.
  for (const absent of ['lease', 'delegation', 'abilities', 'memory-server', 'sdk', 'memories', 'recall']) {
    assert.ok(!bare.includes(absent), `a bare turn is still carrying the ${absent} block`);
  }
  const loaded = promptParts(given.loaded).map((part) => part.id);
  for (const present of ['lease', 'delegation', 'abilities', 'memory-server', 'sdk', 'memories', 'recall', 'context', 'ask']) {
    assert.ok(loaded.includes(present), `a loaded turn is missing the ${present} block`);
  }
  // Every turn says who is asking, whatever else it carries.
  for (const name of Object.keys(given)) {
    assert.ok(promptParts(given[name]).some((part) => part.id === 'ask'), `the ${name} turn never asks anything`);
  }
});
