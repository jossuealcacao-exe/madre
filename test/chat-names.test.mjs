// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The name of a chat (2026-11-19, the author chose «una IA tras la primera respuesta»): a clean line
// at once, then two to five words from an AI, never over a name the person gave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { namePrompt, parseName, provisionalTitle, TITLE_MAX } from '../src/chat-names.mjs';
import { chatIndex, createChat, nameChatAuto, renameChat, touchChat } from '../src/chats.mjs';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';

test('chat names: at once, the first message without greeting, mention, «por favor», link or code, cut at a whole word', () => {
  assert.equal(provisionalTitle('hola, me ayudas a hacer una landing para mi tienda de café? quiero que sea minimalista'), 'Hacer una landing para mi tienda de café');
  assert.equal(provisionalTitle('@claude @codex por favor resume este proyecto'), 'Resume este proyecto');
  assert.equal(provisionalTitle('¿Cómo conecto Shopify con MADRE?'), 'Cómo conecto Shopify con MADRE');
  assert.equal(provisionalTitle('Revisa esto https://ejemplo.com/a/b ```const a = 1``` por favor'), 'Revisa esto por favor');
  // «Quiero que…» stays whole: dropping it would leave «Convoques…».
  assert.match(provisionalTitle('Quiero que convoques a todo el equipo para evaluar las capacidades que tiene cada uno'), /^Quiero que convoques a todo el equipo/);
  const long = provisionalTitle('Arregla el botón de pagar que no responde en el celular cuando el carrito tiene más de diez productos');
  assert.ok(long.length <= TITLE_MAX + 1 && long.endsWith('…') && !/\s…$/.test(long), long);
  assert.equal(provisionalTitle('can you write the README for this repo and add install steps').startsWith('Write the README'), true);
});

test('chat names: the AI is asked for two to five words about what it is about, and only a title is kept', () => {
  const es = namePrompt({ ask: 'Necesito una cotización', answer: 'Claro, aquí va', language: 'es' });
  assert.match(es, /de 2 a 5 palabras, en español/);
  assert.match(es, /La persona escribió: Necesito una cotización/);
  assert.match(namePrompt({ ask: 'x', language: 'en' }), /2 to 5 words, in English/);
  assert.equal(parseName('**Título:** «Landing para tienda de café».'), 'Landing para tienda de café');
  assert.equal(parseName('Error de memoria en el build\nY otra línea'), 'Error de memoria en el build');
  assert.equal(parseName('Claro, aquí tienes un título para tu conversación'), null);
  assert.equal(parseName('Una frase demasiado larga para ser el título de nada en esta vida'), null);
  assert.equal(parseName(''), null);
});

test('chat names: the first message names it on its own, an AI renames it once, and never a name the person gave', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-chat-names-'));
  try {
    const made = await createChat(root, { activate: false });
    await touchChat(root, made.id, { text: 'hola, me ayudas a hacer una landing para mi tienda de café?' });
    let entry = (await chatIndex(root)).chats[made.id];
    assert.equal(entry.title, 'Hacer una landing para mi tienda de café');
    assert.equal(entry.autoTitle, true);
    assert.match(entry.firstAsk, /^hola, me ayudas/);
    // A second message does not rename it.
    await touchChat(root, made.id, { text: 'y que tenga un botón de WhatsApp' });
    assert.equal((await chatIndex(root)).chats[made.id].title, 'Hacer una landing para mi tienda de café');
    // The AI's name, once.
    assert.equal((await nameChatAuto(root, made.id, 'Landing para tienda de café', { tried: true })).title, 'Landing para tienda de café');
    assert.equal(await nameChatAuto(root, made.id, 'Otro nombre', { tried: true }), null);
    assert.equal((await chatIndex(root)).chats[made.id].title, 'Landing para tienda de café');

    // Named by the person: the AI never touches it.
    const mine = await createChat(root, { activate: false });
    await touchChat(root, mine.id, { text: 'Quiero una cotización' });
    await renameChat(root, mine.id, 'Cotización Pepe');
    assert.equal(await nameChatAuto(root, mine.id, 'Cotización de servicios', { tried: true }), null);
    assert.equal((await chatIndex(root)).chats[mine.id].title, 'Cotización Pepe');

    // No name came back twice: the clean first message stays, and it is not asked again.
    const quiet = await createChat(root, { activate: false });
    await touchChat(root, quiet.id, { text: 'Resume este proyecto' });
    await nameChatAuto(root, quiet.id, null, { tried: true });
    entry = (await chatIndex(root)).chats[quiet.id];
    assert.equal(entry.aiNamed, undefined);
    await nameChatAuto(root, quiet.id, null, { tried: true });
    entry = (await chatIndex(root)).chats[quiet.id];
    assert.equal(entry.aiNamed, true);
    assert.equal(entry.title, 'Resume este proyecto');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('chat names: the room asks the local AI when it is on, or else the AI that answered, and counts what that one spent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-chat-names-room-'));
  const asked = [];
  let room = null;
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const invokers = {
      'claude-readonly': async ({ prompt }) => { asked.push(['claude', prompt]); return { text: 'Landing para tienda de café', usage: { inputTokens: 120, outputTokens: 6, totalTokens: 126 } }; },
    };
    room = new Room({
      store,
      agents: [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' }],
      projectRoot: root,
      invokers,
    });
    const used = [];
    room.subscribe((event) => { if (event.type === 'usage.recorded') used.push(event.payload.agent); });
    assert.equal(await room.nameConversation({ ask: 'hola, me ayudas a hacer una landing', answer: 'Claro', agentId: 'claude' }), 'Landing para tienda de café');
    assert.equal(asked[0][0], 'claude');
    assert.match(asked[0][1], /La persona escribió: hola, me ayudas a hacer una landing/);
    assert.deepEqual(used, ['claude']);
    // An agent that is not there, or not ready: no name, and nobody is asked.
    assert.equal(await room.nameConversation({ ask: 'x', agentId: 'codex' }), null);
    // With the local AI on, it is the one asked, and nothing is charged.
    room.setInvoker('ollama', async ({ prompt }) => { asked.push(['ollama', prompt]); return { text: 'Título: Landing de café', usage: { totalTokens: 50, local: true } }; });
    assert.equal(await room.nameConversation({ ask: 'x', agentId: 'claude' }), 'Landing de café');
    assert.equal(asked.at(-1)[0], 'ollama');
    assert.deepEqual(used, ['claude']);
  } finally {
    await room?.close?.();
    await rm(root, { recursive: true, force: true });
  }
});

test('chat names: after the first answer the server names the chat and tells every page, once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-chat-names-server-'));
  const { createPulseServer } = await import('../src/server.mjs');
  const before = process.env.PULSE_CHAT_NAMES;
  process.env.PULSE_CHAT_NAMES = '1';
  const prompts = [];
  const codex = async ({ prompt }) => {
    // The turn and the naming go through the same invoker: the naming is told apart by its prompt.
    if (/Ponle un título|Give this conversation a title/.test(prompt)) { prompts.push(prompt); return { text: 'Landing para tienda de café', usage: null }; }
    return { text: 'Te propongo una landing de una sola página.', usage: null };
  };
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': codex }, broadcastIntervalMs: 30 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path) => fetch(`${base}${path}`).then((response) => response.json());
  const until = async (check, what) => { for (let i = 0; i < 1000; i += 1) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 10)); } assert.fail(`never happened: ${what}`); };
  try {
    const active = (await get('/api/chats')).active;
    const sent = await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hola, me ayudas a hacer una landing para mi tienda de café?', target: 'codex' }) });
    assert.equal(sent.status, 202);
    await until(async () => (await get('/api/chats')).chats.find((chat) => chat.id === active)?.title === 'Landing para tienda de café', 'the AI named the chat');
    assert.equal(prompts.length, 1);
    // In the room's language (English in the suite).
    assert.match(prompts[0], /(?:La persona escribió|The person wrote): hola, me ayudas a hacer una landing/);
    // A second answer does not name it again.
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'y con botón de WhatsApp', target: 'codex' }) });
    await until(async () => (await get('/api/state')).turns.length === 0 && (await get('/api/state')).events.filter((event) => event.type === 'message.created' && event.payload?.role === 'assistant').length >= 2, 'the second answer');
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(prompts.length, 1, 'the chat was named twice');
  } finally {
    if (before === undefined) delete process.env.PULSE_CHAT_NAMES; else process.env.PULSE_CHAT_NAMES = before;
    await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await rm(root, { recursive: true, force: true });
  }
});

test('chat names: an answer MADRE wrote without a model also names the chat (found in the test of 1.1.5)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-chat-names-synthetic-'));
  const { createPulseServer } = await import('../src/server.mjs');
  const before = process.env.PULSE_CHAT_NAMES;
  process.env.PULSE_CHAT_NAMES = '1';
  const codex = async ({ prompt }) => (/Ponle un título|Give this conversation a title/.test(prompt)
    ? { text: 'Promoción de fin de mes', usage: null }
    : { text: 'Todavía no hay nada sobre esto en la memoria.', usage: null, synthetic: 'nothing-yet' });
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const { server } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': codex }, broadcastIntervalMs: 30 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path) => fetch(`${base}${path}`).then((response) => response.json());
  try {
    const active = (await get('/api/chats')).active;
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'una promoción de fin de mes para mi cafetería', target: 'codex' }) });
    let title = null;
    for (let i = 0; i < 500 && title !== 'Promoción de fin de mes'; i += 1) { title = (await get('/api/chats')).chats.find((chat) => chat.id === active)?.title; await new Promise((resolve) => setTimeout(resolve, 10)); }
    assert.equal(title, 'Promoción de fin de mes');
  } finally {
    if (before === undefined) delete process.env.PULSE_CHAT_NAMES; else process.env.PULSE_CHAT_NAMES = before;
    await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await rm(root, { recursive: true, force: true });
  }
});
