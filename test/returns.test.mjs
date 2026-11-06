import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { runSettlement, returnedBlock } from '../src/room/returns.mjs';
import { buildConversationContext } from '../src/conversation-context.mjs';
import { promptParts } from '../src/room/prompt.mjs';

const gitInit = (cwd) => new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd }, (error) => (error ? reject(error) : resolve())));
async function waitFor(store, find, { ms = 8000 } = {}) {
  const until = Date.now() + ms;
  for (;;) {
    const found = find(await store.readAll());
    if (found) return found;
    if (Date.now() > until) throw new Error('waited in vain');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}
// Until a condition holds in this process, without the ledger: a turn may have started and still
// be building its prompt, so a test waits for the agent itself to be reached.
async function until(check, { ms = 15000 } = {}) {
  const stop = Date.now() + ms;
  while (!check()) {
    if (Date.now() > stop) throw new Error('waited in vain');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
const say = (line) => `${process.execPath} -e 'console.log(${JSON.stringify(line)})'`;

test('returns: a #3 turn that asked for commands hears them back at #3, with the project held again', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-returns-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-returns-log-'));
  try {
    await gitInit(root);
    await writeFile(join(root, 'README.md'), 'v1\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const prompts = [];
    let turn = 0;
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'codex-readonly': async ({ prompt }) => {
        prompts.push(prompt);
        turn += 1;
        if (turn === 1) return { text: `Edité el archivo; falta comprobarlo.\n\n\`\`\`pulse-run\nVer que el cambio pasa\n$ ${say('uno')}\n$ ${say('dos')}\n\`\`\``, usage: null };
        return { text: 'Con eso, terminé.', usage: null };
      },
    } });
    room.setRuns(true);
    room.setScopes({ codex: { maxMode: 3 } });
    await room.send({ text: 'cambia el README y compruébalo', target: 'codex', mode: 3 });
    assert.match(prompts[0], /#3 CONTROL\. You may read, create and modify the project's files/, '#3 was told it is read-only');
    assert.doesNotMatch(prompts[0], /#3 CONTROL\. Read-only/);
    let events = await store.readAll();
    const request = events.find((event) => event.type === 'run.requested');
    assert.equal(request.payload.mode, 3, 'the request does not say the mode its turn had');
    const { responseMessageId } = request.payload;

    // One line of two: nothing goes back yet.
    await room.runRequested({ responseMessageId, index: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    events = await store.readAll();
    assert.equal(events.some((event) => event.payload?.returns === responseMessageId), false, 'handed back before the last line ran');

    // The second: it goes back, once, at #3.
    await room.runRequested({ responseMessageId, index: 1 });
    const handed = await waitFor(store, (all) => all.find((event) => event.type === 'message.created' && event.payload.returns === responseMessageId));
    assert.equal(handed.payload.mode, 3);
    assert.match(handed.payload.text, /^↩ @codex: “Ver que el cambio pasa”\n/);
    await waitFor(store, (all) => all.filter((event) => event.type === 'agent.completed').length >= 2);
    events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'control.started').length, 2, 'the hand-back did not hold the project at #3');
    assert.match(prompts[1], /<results>[\s\S]*uno[\s\S]*dos[\s\S]*<\/results>/);
    assert.match(prompts[1], /Your turn was answering: cambia el README y compruébalo/);

    // A line run again later does not hand it back twice.
    await room.runRequested({ responseMessageId, index: 1 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    events = await store.readAll();
    assert.equal(events.filter((event) => event.payload?.returns === responseMessageId).length, 1);
    assert.equal((await room.returnRun({ responseMessageId })).status, 409);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('returns: the human can hand back what ran without the rest; from a phone it never goes above #2', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-returns-part-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-returns-part-log-'));
  try {
    await gitInit(root);
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    const prompts = [];
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'claude-readonly': async ({ prompt }) => {
        prompts.push(prompt);
        return prompts.length === 1
          ? { text: `Necesito ver dos cosas.\n\n\`\`\`pulse-run\nLeer el estado\n$ ${say('estado')}\n$ ${say('otra')}\n\`\`\``, usage: null }
          : { text: 'Visto.', usage: null };
      },
    } });
    room.setRuns(true);
    room.setScopes({ claude: { maxMode: 3 } });
    await room.send({ text: 'revisa', target: 'claude', mode: 3 });
    const { responseMessageId } = (await store.readAll()).find((event) => event.type === 'run.requested').payload;
    assert.equal((await room.returnRun({ responseMessageId })).status, 409, 'handed back with nothing run');
    await room.runRequested({ responseMessageId, index: 0, returnCap: 2 });
    const back = await room.returnRun({ responseMessageId });
    assert.equal(back.ok, true, JSON.stringify(back));
    assert.equal(back.mode, 2, 'a line pressed from a phone took the results back above #2');
    const handed = (await store.readAll()).find((event) => event.payload?.returns === responseMessageId);
    assert.match(handed.payload.text, /1 of the 2 commands you asked for ran/);
    assert.match(prompts.at(-1), /The human chose not to run: \$ .*otra/);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('returns: results wait while the agent that asked is still answering, and STOP ALL drops what waits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-returns-wait-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-returns-wait-log-'));
  // Out here so a failure still closes it: a turn left waiting would keep the file running forever.
  let room = null;
  try {
    await gitInit(root);
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    let release = null;
    let calls = 0;
    room = new Room({ store, agents, projectRoot: root, invokers: {
      'claude-readonly': async ({ signal }) => {
        calls += 1;
        if (calls === 1) return { text: `Pruébalo.\n\n\`\`\`pulse-run\nVer\n$ ${say('ok')}\n\`\`\``, usage: null };
        if (calls === 2) {
          // A slow second turn, still going when the command ends.
          await new Promise((resolve, reject) => { release = resolve; signal?.addEventListener('abort', () => reject(new Error('stopped'))); });
          return { text: 'Otra cosa.', usage: null };
        }
        return { text: 'Visto el resultado.', usage: null };
      },
    } });
    room.setRuns(true);
    await room.send({ text: 'arregla', target: 'claude' });
    const { responseMessageId } = (await store.readAll()).find((event) => event.type === 'run.requested').payload;
    const busy = room.send({ text: 'mientras tanto, otra cosa', target: 'claude' });
    await until(() => release);
    await room.runRequested({ responseMessageId, index: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal((await store.readAll()).some((event) => event.payload?.returns === responseMessageId), false, 'handed back while the agent was answering');
    release();
    await busy;
    await waitFor(store, (all) => all.find((event) => event.payload?.returns === responseMessageId));
    await until(() => !room.activeTurns().length);

    // Again, and this time STOP ALL comes first: nothing starts by itself afterwards.
    calls = 0;
    release = null;
    await room.send({ text: 'arregla otra vez', target: 'claude' });
    const second = (await store.readAll()).filter((event) => event.type === 'run.requested').at(-1).payload.responseMessageId;
    const busyAgain = room.send({ text: 'y otra', target: 'claude' });
    await until(() => release);
    await room.runRequested({ responseMessageId: second, index: 0 });
    await room.stopAll();
    await busyAgain.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal((await store.readAll()).some((event) => event.payload?.returns === second), false, 'STOP ALL did not drop what was waiting');
  } finally {
    await room?.shutdown().catch(() => {});
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('returns: long outputs keep their ends and never push the request out of the window', () => {
  const long = `${'x'.repeat(5000)}\nTOTAL: 12 passed\n`;
  const events = [
    { sequence: 1, type: 'message.created', payload: { messageId: 'u1', role: 'user', sender: 'you', target: 'codex', text: 'crea el PDF con la marca' } },
    { sequence: 2, type: 'message.created', payload: { messageId: 'a1', role: 'assistant', sender: 'codex', target: 'you', text: 'Necesito leer esto.' } },
    { sequence: 3, type: 'run.requested', payload: { messageId: 'u1', responseMessageId: 'a1', agent: 'codex', reason: 'Leer', commands: [0, 1, 2, 3, 4].map((n) => ({ line: `cat f${n}`, argv: ['cat', `f${n}`] })).concat([{ line: 'ls | head', why: 'pipe' }]), mode: 3 } },
    ...[0, 1, 2, 3, 4].map((index) => ({ id: `c${index}`, sequence: 4 + index, type: 'command.output', payload: { name: 'run', title: `$ cat f${index} · exit 0`, text: long, ok: true, run: { responseMessageId: 'a1', index, exitCode: 0, durationMs: 1000 } } })),
  ];
  const window = buildConversationContext(events, { maxChars: 16000 });
  assert.ok(window.messages.some((message) => message.text === 'crea el PDF con la marca'), 'five outputs pushed the request out of the window');
  for (const message of window.messages.filter((one) => one.role === 'command')) {
    assert.ok(message.text.length < 1400);
    assert.match(message.text, /TOTAL: 12 passed/, 'the end of an output was cut');
  }
  const settlement = runSettlement(events, 'a1');
  assert.equal(settlement.done, true);
  assert.deepEqual(settlement.runnable, [0, 1, 2, 3, 4]);
  const block = returnedBlock({ settlement, asking: 'crea el PDF con la marca', said: 'Necesito leer esto.', replySequence: 2 });
  assert.ok(block.length < 13000, `the block is ${block.length} characters`);
  assert.equal(block.match(/TOTAL: 12 passed/g).length, 5);
  assert.match(block, /could not run at all \(no shell\): \$ ls \| head/);
});

test('prompt: #4 is told it may change the project and run commands, never that it is read-only', () => {
  const base = { agent: { id: 'codex' }, text: 'despliega', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [] } };
  const mode = (n) => promptParts({ ...base, mode: n }).find((part) => part.id === 'mode').text;
  assert.match(mode(4), /You may modify the project and run commands/);
  assert.doesNotMatch(mode(4), /Read-only/);
  assert.match(mode(1), /Read-only/);
  assert.match(mode(2), /I need #3 for 15 min/, 'the way to ask for a mode with its time is not taught');
  assert.doesNotMatch(mode(4), /I need #3/);
  assert.doesNotMatch(mode(0), /I need #3/);
});
