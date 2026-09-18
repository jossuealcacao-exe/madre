import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { madreAgent, madreInvoker, gather, actionRequest, briefingFor, MADRE_ADAPTER } from '../src/adapters/madre.mjs';
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
    assert.deepEqual([declined.declined, declined.usage.totalTokens, declined.usage.local, calls.length], ['action', 0, true, before]);
    assert.match((await invoke({ prompt: 'p', text: 'Convene the crew and tell @codex to start' })).text, /I only answer from the room's memory/);
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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
  }
});
