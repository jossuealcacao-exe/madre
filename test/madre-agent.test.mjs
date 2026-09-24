import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { madreAgent, madreInvoker, gather, actionRequest, briefingFor, localReply, roundTable, whoAmI, memoryRequest, MADRE_ADAPTER } from '../src/adapters/madre.mjs';
import { parseDirectives } from '../src/directives.mjs';
import { buildConversationContext } from '../src/conversation-context.mjs';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory } from '../src/memory.mjs';
import { createPulseServer } from '../src/server.mjs';
import { budgetTokens } from '../src/room/budget.mjs';
import { capabilityOf, resolveScopes } from '../src/capabilities.mjs';
import { probeAgentAuth } from '../src/auth-probe.mjs';

const running = { running: true, host: 'http://o', models: [{ name: 'qwen2.5:3b' }], embedModel: null, chatModel: 'qwen2.5:3b' };
const down = { running: false, host: 'http://o', models: [], embedModel: null, chatModel: null };

test('@madre: present and ready only when Ollama has a chat model; read-only by capability; probe says local', async () => {
  const on = madreAgent(running);
  assert.deepEqual({ id: on.id, ready: on.ready, adapter: on.adapter, version: on.version, local: on.local }, { id: 'madre', ready: true, adapter: MADRE_ADAPTER, version: 'qwen2.5:3b', local: true });
  assert.equal(madreAgent(down).ready, false);
  assert.equal(madreAgent(running, { enabled: false }).ready, false);
  assert.equal(capabilityOf('madre').write, false);
  assert.equal(resolveScopes('madre').maxMode, 1, 'never above EXCHANGE');
  assert.equal(budgetTokens({ totalTokens: 900, inputTokens: 800, outputTokens: 100, local: true }), 0, 'local tokens weigh nothing');
  assert.deepEqual(await probeAgentAuth(on), { state: 'signed-in', detail: 'local · qwen2.5:3b' });
  assert.equal((await probeAgentAuth(madreAgent(down))).state, 'signed-out');
});

test('@madre: answers from the whole archive with a grounded system prompt, and refuses when Ollama is gone', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-madre-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (let i = 1; i <= 6; i += 1) await store.append('message.created', { messageId: `m${i}`, role: i % 2 ? 'user' : 'assistant', sender: i % 2 ? 'you' : 'codex', target: i % 2 ? 'codex' : 'you', text: i === 2 ? 'Decision: RIPLEY renders HTML inside a sealed frame with scripts allowed.' : `Filler ${i} about onboarding colours ${'x'.repeat(80)}` });
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    memory.addMemories([{ kind: 'decision', text: 'RIPLEY runs page scripts in an opaque-origin frame.', sources: [2] }], { agent: 'gemini', fromSequence: 1, throughSequence: 6 });
    const archive = await gather(memory, 'what did we decide about RIPLEY and scripts?');
    assert.equal(archive.notes.length, 1);
    assert.ok(archive.quotes.some((entry) => entry.sequence === 2));
    assert.match(archive.text, /\[note · decision · #1–#6\] RIPLEY runs page scripts/);
    assert.match(archive.text, /\[#2 · .* · @codex\] Decision: RIPLEY renders HTML/);

    const calls = [];
    const fetchImpl = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ message: { content: 'We decided RIPLEY runs scripts in a sealed frame [#2].' }, prompt_eval_count: 500, eval_count: 20 }) }; };
    const invoke = madreInvoker({ memory, ollama: () => running, fetchImpl });
    const answer = await invoke({ prompt: 'You are @madre.\nUser message: what did we decide about RIPLEY and scripts?', text: 'what did we decide about RIPLEY and scripts?' });
    assert.match(answer.text, /\[#2\]/);
    assert.equal(answer.usage.local, true);
    assert.equal(answer.usage.totalTokens, 520);
    assert.deepEqual(answer.grounded, { notes: 1, quotes: archive.quotes.length });
    assert.equal(calls[0].model, 'qwen2.5:3b');
    assert.match(calls[0].messages[0].content, /You are @madre, the memory of this MADRE project room/);
    assert.match(calls[0].messages[1].content, /ARCHIVE \(what the room remembers[\s\S]*Decision: RIPLEY renders HTML[\s\S]*QUESTION FROM THE HUMAN:\nwhat did we decide about RIPLEY and scripts\?/);
    assert.match(calls[0].messages[1].content, /REMINDER: You are @madre[\s\S]*not Claude, Codex, Gemini or OpenCode[\s\S]*QUESTION FROM THE HUMAN/, 'identity repeated right before the question');
    assert.equal(calls[0].options.num_ctx, 8192, 'a window wide enough that the system prompt is never dropped');

    // Orders it cannot carry out are answered here, in the human's language, without the model.
    const before = calls.length;
    const declined = await invoke({ prompt: 'p', text: 'Directiva, convoca a una reunión con el crew y comparte los detalles del proyecto' });
    assert.match(declined.text, /Solo respondo desde la memoria[\s\S]*@codex, @claude, @gemini u @opencode/);
    assert.equal(declined.synthetic, 'declined');
    assert.deepEqual([declined.declined, declined.usage.totalTokens, declined.usage.local, calls.length], ['action', 0, true, before]);
    assert.match((await invoke({ prompt: 'p', text: 'Convene the crew and tell @codex to start' })).text, /I only answer from the room's memory/, 'delegation off: convening is declined');
    assert.equal(actionRequest('No realizaste la reunión convoca a todos')?.startsWith('Solo respondo'), true);
    assert.equal(actionRequest('¿qué decidimos sobre la reunión del lunes?'), null, 'questions pass through');
    assert.equal(actionRequest('what did we decide about RIPLEY and scripts?'), null);
    assert.equal(actionRequest('Which files did codex create yesterday'), null);
    assert.equal(actionRequest('resume lo que se dijo sobre el empaque'), null, 'a recall request is not an action');
    assert.match(briefingFor({ prompt: 'p', text: 'q', archive: '' }), /nothing in the archive[\s\S]*REMINDER[\s\S]*QUESTION FROM THE HUMAN:\nq$/);
    assert.ok(!calls[0].messages[1].content.includes('You are @madre.'), 'the room briefing for CLIs is not forwarded, only its transcript');
    let state = running;
    const flaky = madreInvoker({ memory, ollama: () => state, fetchImpl });
    state = down;
    await assert.rejects(flaky({ prompt: 'p', text: 'q' }), /needs Ollama running with a chat model/);
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('@madre: joins the roster when Ollama is up, answers a turn, is never the archivist, and leaves when Ollama goes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-madre-room-'));
  const project = join(root, 'p'); await mkdir(project);
  let probe = running;
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const chat = async (url, init) => (url.endsWith('/api/chat') ? { ok: true, json: async () => ({ message: { content: 'The room never discussed that.' }, prompt_eval_count: 10, eval_count: 5 }) } : { ok: true, json: async () => ({ models: [] }) });
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, ollamaProbe: async () => probe, reportFetch: chat });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const state = await fetch(`${base}/api/state`).then((response) => response.json());
    const madre = state.agents.find((agent) => agent.id === 'madre');
    assert.ok(madre, '@madre is in the roster');
    assert.equal(madre.ready, true);
    assert.equal(madre.version, 'qwen2.5:3b');
    const memorySettings = (await fetch(`${base}/api/settings`).then((response) => response.json())).settings.memory;
    assert.ok(!memorySettings.candidates.some((c) => c.id === 'madre'), '@madre never distils');
    // A turn addressed to @madre runs through the local adapter; the reply carries local usage and no budget charge.
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'did we ever discuss the webhook?', target: 'madre' }) });
    let reply = null;
    for (let attempt = 0; attempt < 120 && !reply; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 25)); reply = (await store.readAll()).find((event) => event.type === 'message.created' && event.payload.sender === 'madre'); }
    assert.ok(reply, '@madre answered');
    assert.match(reply.payload.text, /never discussed/);
    // The usage line lands a moment after the reply; wait for the turn to complete.
    for (let attempt = 0; attempt < 120 && !(await store.readAll()).some((event) => event.type === 'agent.completed' && event.payload.agent === 'madre'); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 25));
    const usage = (await store.readAll()).find((event) => event.type === 'usage.recorded' && event.payload.agent === 'madre');
    assert.equal(usage.payload.budgetTokens, 0);
    assert.equal(usage.payload.usage.local, true);
    // Ollama goes away: a recheck removes @madre and the room is told.
    probe = down;
    await fetch(`${base}/api/ollama/probe`, { method: 'POST' });
    const after = await fetch(`${base}/api/state`).then((response) => response.json());
    assert.ok(!after.agents.some((agent) => agent.id === 'madre'), '@madre left');
    // The first seating happens before the room exists (the roster is the initial state); the leaving is announced.
    const updates = (await store.readAll()).filter((event) => event.type === 'agents.updated');
    assert.ok(updates.length >= 1);
    assert.deepEqual(updates.at(-1).payload.removed, ['madre']);
    assert.match(updates.at(-1).payload.reason, /left the room/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});


test('@madre settles identity, memory requests and round tables without the model; closing turns and questions reach it', async () => {
  const crew = ['codex', 'claude', 'gemini', 'opencode'];
  // Identity, in the asker's language, naming the archivist as its other half.
  assert.match(whoAmI('madre que haces?', { model: 'qwen2.5:7b' }), /Soy @madre[\s\S]*qwen2\.5:7b[\s\S]*archivista es mi otra mitad[\s\S]*memory_note/);
  assert.match(whoAmI('Pero se supone que tu eres el archivista'), /Soy @madre/);
  assert.match(whoAmI('who are you?'), /I am @madre[\s\S]*archivist is my other half/);
  assert.equal(whoAmI('what did we decide about RIPLEY?'), null);

  // Memory requests: agents are pointed at memory_note, humans at the archivist.
  assert.match(memoryRequest('Genera una memoria nueva de esta sala, tipo fact/summary, sobre la ronda', { requester: 'codex' }), /Yo no escribo memorias[\s\S]*memory_note/);
  assert.match(memoryRequest('La directiva actual es que aprendas de las respuestas que te comparte el crew', { requester: 'you' }), /La memoria no se dicta, se destila/);
  assert.match(memoryRequest('remember this: the API key lives in the keychain', { requester: 'you' }), /Memory is not dictated/);
  assert.equal(memoryRequest('¿recuerdas qué decidimos sobre el empaque?'), null, 'a question about memory goes to the archive');

  // Round table: a plan the room writes, one step per agent online, @madre closes.
  const round = roundTable('@madre, pregúntale al crew qué harían si vivieran como humanos un día', { crew });
  assert.equal(round.question, 'qué harían si vivieran como humanos un día');
  const plan = parseDirectives(round.text, { self: 'madre', available: crew });
  assert.deepEqual(plan.steps.map((step) => step.agent), crew);
  assert.match(plan.steps[0].text, /Pregunta de la sala, vía @madre: «qué harían si vivieran como humanos un día»/);
  assert.match(plan.closing, /^Resume con citas \[#n\][\s\S]*sin inventar consenso\.$/);
  assert.equal(plan.ignored.length, 0);
  assert.match(roundTable('Directiva, convoca a una reunión con el crew y comparte los detalles del proyecto', { crew }).question, /^comparte los detalles del proyecto$/);
  assert.match(roundTable('convoca al crew', { crew }).question, /^¿Qué sabes de este proyecto/, 'no question given: the default one, in Spanish');
  assert.equal(parseDirectives(roundTable('ask the crew which files changed', { crew: ['codex', 'gemini'] }).text, { self: 'madre', available: ['codex', 'gemini'] }).steps.length, 2);
  assert.match(roundTable('convoca al crew', { crew: [] }).text, /No hay agentes CLI en la fila/);
  assert.equal(roundTable('¿qué decidimos sobre RIPLEY?', { crew }), null);

  // The dispatcher: order, who may convene, what passes through.
  assert.equal(localReply('convoca al crew', { requester: 'you', crew, delegation: true }).kind, 'roundtable');
  assert.equal(localReply('convoca al crew', { requester: 'you', crew, delegation: false }).kind, 'declined', 'delegation off: no plan, a refusal that says how to ask');
  assert.equal(localReply('Convoca a todos y dile a @gemini que empiece', { requester: 'codex', crew, delegation: true }).kind, 'declined', 'agents never convene through @madre');
  assert.match(localReply('Convoca a todos y dile a @gemini que empiece', { requester: 'codex', crew, delegation: true }).text, /memory_note/);
  assert.equal(localReply('Resume con citas [#n] lo que el crew respondió a: «convoca y crea archivos».\n(The delegated agents have answered above; this is your closing turn.)', { requester: 'madre', crew, delegation: false }), null, 'the closing turn always reaches the model');
  assert.equal(localReply('resume lo que se dijo sobre el empaque', { requester: 'you', crew, delegation: true }), null);

  // Synthetic replies are dropped from @madre's transcript and from the archive.
  const events = [
    { sequence: 1, type: 'message.created', payload: { messageId: 'a', role: 'user', sender: 'you', target: 'madre', text: 'convoca al crew' } },
    { sequence: 2, type: 'message.created', payload: { messageId: 'b', role: 'assistant', sender: 'madre', target: 'you', text: 'Convoco al crew…', synthetic: 'roundtable' } },
    { sequence: 3, type: 'message.created', payload: { messageId: 'c', role: 'assistant', sender: 'codex', target: 'madre', text: 'Sé que el proyecto usa SQLite.' } },
  ];
  assert.deepEqual(buildConversationContext(events, { omitSynthetic: true }).messages.map((m) => m.messageId), ['a', 'c']);
  assert.deepEqual(buildConversationContext(events).messages.map((m) => m.messageId), ['a', 'b', 'c'], 'CLIs still see what @madre said');
  const root = await mkdtemp(join(tmpdir(), 'pulse-madre-syn-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    for (const event of events) await store.append(event.type, event.payload);
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).initialize(store);
    assert.equal(memory.count(), 2, 'the canned reply never enters the archive');
    assert.ok(memory.recall('Convoco al crew', { limit: 5 }).entries.every((entry) => entry.sender !== 'madre'), 'nothing @madre said by rote is quotable');
    memory.close();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
