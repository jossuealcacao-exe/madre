import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoomMemory } from '../src/memory.mjs';
import { loadConfig, updateConfig } from '../src/config.mjs';
import { markProject, salasProjectRoot, salasRoomId } from '../src/salas.mjs';
import { createPulseServer, projectRoomId } from '../src/server.mjs';
import { phonePolicy } from '../src/bridge/policy.mjs';
import { CHANNEL_HEADER, NO_SUCH_LINK, channelKey, countRecent, receivesOrders, signContract } from '../src/enlaces.mjs';
import enlaces, { BRIEF, ENLACE_TOOLS, SERVER_NAME, TOOLS, callTool, handleRequest } from '../src/modules/enlaces.mjs';
import { hostWords } from '../src/i18n.mjs';

// ENLACES, the door an agent reads through (docs/MACROVERSO.md, phase 3c): the module that hands a
// turn the MCP server `pulse-enlaces` only when a signed link lets this room read, the server's
// two tools, the side that asks (`/api/enlace/ask`), the notices between rooms, and signing and
// revoking from Salas. Two real rooms, A and B, on one state root; nothing leaves 127.0.0.1.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
const SELF = fileURLToPath(new URL('../src/modules/enlaces.mjs', import.meta.url));
const hash = (q) => createHash('sha256').update(q).digest('hex').slice(0, 16);
const events = async (room, type) => (await room.store.readAll()).filter((event) => event.type === type);

test('enlaces · the module, the tool, the asking side, the notices, and signing from Salas, end to end with two rooms', async () => {
  const state = await scratch('madre-enlaces-3c-');
  const projectA = await realpath(await scratch('madre-enlaces-3c-a-'));
  const projectB = await realpath(await scratch('madre-enlaces-3c-b-'));
  // S-021: a reading belongs to a turn running in the room that reads. A turn of B that says
  // «HOLD THE TURN» waits here, with the agent and the turn its pulse-enlaces server was given, as a
  // CLI holding the tool would; the test reads through it and lets it go.
  let held = null;
  const invokers = { 'codex-readonly': async ({ prompt, mcpServers = [] }) => {
    if (!prompt.includes('HOLD THE TURN')) return { text: 'done' };
    const server = mcpServers.find((one) => one.name === 'pulse-enlaces');
    await new Promise((release) => { held = { env: server?.env ?? {}, release }; });
    return { text: 'done' };
  } };
  const a = await createPulseServer({ projectRoot: projectA, stateRoot: state, agents: roster, invokers });
  const b = await createPulseServer({ projectRoot: projectB, stateRoot: state, agents: roster, invokers });
  const portA = await listen(a.server);
  await a.markOpen(portA);
  const portB = await listen(b.server);
  await b.markOpen(portB);
  const [idA, idB, nameA, nameB] = [projectRoomId(projectA), projectRoomId(projectB), basename(projectA), basename(projectB)];
  // The room of Salas does not exist yet (phase 3d); its id does, and it is known once its
  // notebook folder is on disk, asleep like any closed room.
  const salas = salasRoomId(state);
  await mkdir(salasProjectRoot(state), { recursive: true });
  await markProject(join(state, 'rooms', salas), salasProjectRoot(state));
  const key = await channelKey(state);
  const post = (port, path, payload, headers = {}) => fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
  const page = (port) => ({ origin: `http://127.0.0.1:${port}` });
  const channel = { [CHANNEL_HEADER]: key };
  const phone = { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone' };
  let live = null;   // { agent, turn } of the held turn of B
  const ask = (payload, headers = channel, port = portB) => post(port, '/api/enlace/ask', { ...(live ?? {}), ...payload }, headers);
  const toolsOf = async (port, mode = 1) => (await (await fetch(`http://127.0.0.1:${port}/api/briefing?agent=codex&mode=${mode}`)).json()).launch.mcpServers;
  const turnB = { agent: 'codex', mode: 1, port: portB, roomDir: join(state, 'rooms', idB) };
  const ctxB = async () => ({ stateRoot: state, projectRoot: projectB, config: await loadConfig(state), env: {} });
  const env = { PULSE_HOME: state, PULSE_ENLACES_ROOM: idB, PULSE_ENLACES_PORT: String(portB), PULSE_ENLACES_AGENT: 'codex' };
  try {
    // A's archive: what travels and what does not.
    const memory = await new RoomMemory(join(state, 'rooms', idA, 'memory.sqlite')).initialize();
    memory.addMemories([
      { kind: 'decision', text: 'Webhook signatures are verified before parsing.', sources: [1] },
      { kind: 'fact', text: 'The client of record is Globex.', sources: [1] },
      { kind: 'question', text: 'Should the webhook retry on 5xx?', sources: [1] },
    ], { agent: 'codex', fromSequence: 1, throughSequence: 1 });
    memory.close();

    // ---- The module: nothing without a contract, nothing in #0, and never from the phone's side.
    assert.equal(enlaces.id, 'enlaces');
    assert.equal(enlaces.name, 'Connections');
    assert.equal(enlaces.defaults.enabled, true, 'ENLACES is not on by default');
    assert.deepEqual(await enlaces.toolsForTurn(await ctxB(), turnB), [], 'a tool travelled with no link signed');
    assert.ok(!(await toolsOf(portB)).some((server) => server.name === SERVER_NAME), 'THE LAUNCH shows a server no link justifies');
    for (const [method, path] of [['POST', '/api/salas/enlaces'], ['POST', '/api/salas/enlaces/revoke'], ['POST', '/api/enlace/ask'], ['POST', '/api/enlace/notice']]) {
      assert.equal(phonePolicy({ method, pathname: path }).allow, false, `the bridge lets a phone at ${path}`);
    }

    // ---- Signing from Salas: from the room's own page, with the rules of the contract and of Salas.
    assert.equal((await post(portA, '/api/salas/enlaces', { a: idA, b: idB, direction: 'a→b', kinds: ['decision', 'fact'] }, phone)).status, 403, 'signed from a phone');
    assert.equal((await post(portA, '/api/salas/enlaces', { a: idA, b: idB, direction: 'a→b', kinds: ['decision', 'fact'] }, { origin: 'http://127.0.0.1:1' })).status, 403, 'signed from another page');
    assert.equal((await post(portA, '/api/salas/enlaces', { a: idA, b: 'nowhere-0123456789abcdef', direction: 'a→b', kinds: ['fact'] }, page(portA))).status, 404);
    const sideways = await post(portA, '/api/salas/enlaces', { a: idA, b: idB, direction: 'sideways', kinds: ['fact'] }, page(portA));
    assert.equal(sideways.status, 422);
    assert.match((await sideways.json()).error, /direction/);
    const fromSalas = await post(portA, '/api/salas/enlaces', { a: salas, b: idB, direction: 'a→b', kinds: ['fact'] }, page(portA));
    assert.equal(fromSalas.status, 422, 'the room of Salas served');
    assert.match((await fromSalas.json()).error, /never shares through a connection/);
    const ordersAlone = await post(portA, '/api/salas/enlaces', { a: idA, b: idB, direction: 'a→b', kinds: ['fact'], orders: { allowed: true, maxMode: 1, perHour: 6 } }, page(portA));
    assert.equal(ordersAlone.status, 422, 'orders without the room of Salas');
    assert.match((await ordersAlone.json()).error, /need the Coordinator at one end/);
    const toSalas = { a: salas, b: idB, direction: 'b→a', kinds: ['fact'], orders: { allowed: true, maxMode: 2, perHour: 4 } };
    assert.equal((await post(portA, '/api/salas/enlaces', toSalas, page(portA))).status, 403, 'orders signed with no designation');
    assert.equal((await post(portA, '/api/salas/enlaces', { ...toSalas, designation: nameA }, page(portA))).status, 403, 'orders signed with the wrong room\'s name');
    const ordered = await post(portA, '/api/salas/enlaces', { ...toSalas, designation: nameB.toUpperCase() }, page(portA));
    assert.equal(ordered.status, 200);
    const orderedContract = (await ordered.json()).contract;
    assert.deepEqual(orderedContract.orders, { allowed: true, maxMode: 2, perHour: 4 });
    assert.equal(receivesOrders(orderedContract, salas), idB);
    // B serves Salas under that one and was told so, by the channel, as a line and never a message.
    const toldB = await events(b, 'enlace.signed');
    assert.equal(toldB.length, 1);
    assert.deepEqual(toldB[0].payload, { contract: orderedContract, other: 'salas', otherId: salas, coordinator: true, role: 'serves', kinds: ['fact'], expires: null, orders: orderedContract.orders });
    assert.equal((await events(b, 'message.created')).length, 0);

    // Orders left out are no orders: off, #0, six an hour (A serves Salas questions, to be read by
    // BISHOP: B and Salas are already connected, and a pair is connected once).
    const plain = (await (await post(portA, '/api/salas/enlaces', { a: idA, b: salas, direction: 'a→b', kinds: ['question'] }, page(portA))).json()).contract;
    assert.deepEqual(plain.orders, { allowed: false, maxMode: 0, perHour: 6 }, 'orders absent did not default to none');
    assert.equal((await events(a, 'enlace.signed')).at(-1).payload.role, 'serves');

    // The link this test reads through: A serves B, decisions and facts, more readings an hour
    // than this test makes (the ceiling of six is 3b's, and it is proved there).
    const signed = await post(portA, '/api/salas/enlaces', { a: idA, b: idB, direction: 'a→b', kinds: ['decision', 'fact'], expires: null, orders: { allowed: false, maxMode: 0, perHour: 50 } }, page(portA));
    assert.equal(signed.status, 200);
    const { contract } = await signed.json();
    // Two projects are connected once: the same pair, either way round or both, is refused while
    // this one is in force.
    for (const again of [{ a: idA, b: idB, direction: 'a→b' }, { a: idB, b: idA, direction: 'a→b' }, { a: idA, b: idB, direction: 'both' }]) {
      const twice = await post(portA, '/api/salas/enlaces', { ...again, kinds: ['fact'] }, page(portA));
      assert.equal(twice.status, 409, `${again.direction} signed again over a pair in force`);
      assert.match((await twice.json()).error, /already connected/);
    }
    assert.deepEqual(Object.keys(contract), ['id', 'rooms', 'direction', 'kinds', 'zones', 'expires', 'revoked', 'orders', 'signed', 'recall', 'train', 'state', 'deliver']);
    assert.equal(contract.recall, false, '3e: recall is off unless ticked');
    assert.deepEqual(contract.orders, { allowed: false, maxMode: 0, perHour: 50 });
    assert.deepEqual((await events(a, 'enlace.signed')).filter((event) => event.payload.contract.id === contract.id).map((event) => event.payload), [{ contract, other: nameB, otherId: idB, coordinator: false, role: 'serves', kinds: ['decision', 'fact'], expires: null, orders: contract.orders }]);
    assert.deepEqual((await events(b, 'enlace.signed')).at(-1).payload, { contract, other: nameA, otherId: idA, coordinator: false, role: 'reads', kinds: ['decision', 'fact'], expires: null, orders: contract.orders });

    // ---- Salas sees it: the id of its own room, the links in force, and no traffic yet.
    const list = await (await fetch(`http://127.0.0.1:${portA}/api/salas`)).json();
    assert.equal(list.salas, salas);
    assert.deepEqual(list.enlaces.map((one) => one.id).sort(), [contract.id, orderedContract.id, plain.id].sort());
    assert.deepEqual(list.enlaces.find((one) => one.id === contract.id), { ...contract, traffic: { reads24h: 0, reads1h: 0, lastAt: null, lastAgent: null, lastRoom: null } });

    // ---- The module now hands the server to B, and only to B, and only above #0.
    const [server] = await enlaces.toolsForTurn(await ctxB(), turnB);
    assert.equal(server.name, SERVER_NAME);
    assert.equal(server.command, process.execPath);
    assert.deepEqual(server.args, [SELF]);
    assert.deepEqual(server.tools, ENLACE_TOOLS);
    assert.deepEqual(server.tools, TOOLS.map((tool) => tool.name));
    assert.deepEqual(server.env, env);
    assert.equal(server.sends, undefined, 'a reading tool declared that it sends');
    assert.equal(server.brief, BRIEF);
    assert.match(server.brief, /Read-only/);
    assert.match(server.brief, /according to room/);
    assert.ok(!server.brief.includes(key) && !JSON.stringify(server.env).includes(key), 'the key reached the turn');
    assert.deepEqual(await enlaces.toolsForTurn(await ctxB(), { ...turnB, mode: 0 }), [], 'the tool travelled in #0');
    assert.deepEqual(await enlaces.toolsForTurn({ ...(await ctxB()), config: { ...(await loadConfig(state)), modules: { enlaces: { enabled: false } } } }, turnB), [], 'switched off and still offered');
    assert.deepEqual(await enlaces.toolsForTurn(await ctxB(), { ...turnB, roomDir: join(state, 'rooms', idA) }), [], 'A reads from nobody');
    // Counted in THE LAUNCH as any server: by name, with the names of its environment and never a value.
    const launched = (await toolsOf(portB)).find((one) => one.name === SERVER_NAME);
    assert.ok(launched, 'THE LAUNCH of B does not show pulse-enlaces');
    assert.deepEqual(launched.tools, ENLACE_TOOLS);
    assert.deepEqual(launched.env, ['PULSE_ENLACES_PORT', 'PULSE_ENLACES_ROOM', 'PULSE_HOME', 'PULSE_ENLACES_AGENT']);
    assert.ok(!(await toolsOf(portB, 0)).some((one) => one.name === SERVER_NAME), 'offered in #0');
    assert.ok(!(await toolsOf(portA)).some((one) => one.name === SERVER_NAME), 'offered to the room that only serves');

    // ---- The asking side: B asks itself, with the key, and it asks A — from a turn it is running.
    assert.equal((await post(portB, '/api/messages', { text: 'HOLD THE TURN', target: 'codex', mode: 1 })).status, 202);
    for (let attempt = 0; attempt < 250 && !held; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(held, 'the turn of B never started');
    assert.equal(held.env.PULSE_ENLACES_AGENT, 'codex', 'the tool was not told its agent');
    assert.match(held.env.PULSE_ENLACES_TURN ?? '', /^[0-9a-f-]{36}$/, 'the tool was not told its turn');
    assert.equal((await ask({ room: idA })).status, 409, 'read with no turn');
    assert.equal((await ask({ room: idA, agent: 'claude', turn: held.env.PULSE_ENLACES_TURN })).status, 409, 'read in the name of another agent');
    assert.equal((await ask({ room: idA, agent: 'codex', turn: '00000000-0000-0000-0000-000000000000' })).status, 409, 'read for a turn that is not running');
    live = { agent: 'codex', turn: held.env.PULSE_ENLACES_TURN };
    env.PULSE_ENLACES_TURN = live.turn;
    assert.equal((await ask({ room: idA }, { ...channel, ...phone })).status, 403, 'asked from a phone');
    assert.equal((await ask({ room: idA }, { ...channel, ...page(portB) })).status, 403, 'asked from a page');
    assert.equal((await ask({ room: idA }, {})).status, 403, 'asked without the key');
    assert.equal((await ask({ room: 'nowhere' })).status, 404);
    // A runs no turn: it learns nothing, not even whether a link exists (the arrow itself is held by
    // the serving side, test/enlaces.test.mjs).
    assert.equal((await ask({ room: idB }, channel, portA)).status, 409, 'A read with no turn of its own');
    const first = await ask({ room: idA, query: 'webhook signatures', limit: 1 });
    assert.equal(first.status, 200);
    const got = await first.json();
    assert.deepEqual(Object.keys(got), ['from', 'contract', 'notes']);
    assert.equal(got.from, nameA, 'the source is named by its id, not its name');
    assert.equal(got.contract, contract.id);
    assert.deepEqual(got.notes.map((note) => [note.kind, note.zone, note.text]), [['decision', 'hold', 'Webhook signatures are verified before parsing.']]);
    // By name, the latest of the kinds signed; and fewer kinds than signed, never more.
    const byName = await (await ask({ room: nameA.toUpperCase() })).json();
    assert.deepEqual(byName.notes.map((note) => note.kind), ['fact', 'decision']);
    const narrowed = await (await ask({ room: nameA, kinds: ['decision', 'question'] })).json();
    assert.deepEqual(narrowed.notes.map((note) => note.kind), ['decision']);
    const outside = await ask({ room: nameA, kinds: ['question'] });
    assert.equal(outside.status, 422, 'a kind the link does not cross was asked across it');
    assert.match((await outside.json()).error, /read only: decision, fact/);
    // What each room kept: counters, never words. The query is a hash in both.
    const received = await events(b, 'enlace.received');
    assert.deepEqual(received.map((event) => event.payload), [
      { contract: contract.id, from: idA, count: 1, turn: live.turn, agent: 'codex', query: hash('webhook signatures') },
      { contract: contract.id, from: idA, count: 2, turn: live.turn, agent: 'codex', query: null },
      { contract: contract.id, from: idA, count: 1, turn: live.turn, agent: 'codex', query: null },
    ]);
    const reads = await events(a, 'enlace.read');
    assert.deepEqual(reads.map((event) => [event.payload.to, event.payload.count, event.payload.kinds, event.payload.query, event.payload.agent]), [[idB, 1, ['decision', 'fact'], hash('webhook signatures'), 'codex'], [idB, 2, ['decision', 'fact'], null, 'codex'], [idB, 1, ['decision'], null, 'codex']]);
    assert.ok(!JSON.stringify([received, reads]).includes('Webhook') && !JSON.stringify([received, reads]).includes('Globex'), 'a note or a query reached a ledger');
    const crossings = (await readFile(join(state, 'rooms', idB, 'enlaces.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(crossings.map((line) => [line.kind, line.contract, line.other, line.count, line.agent, line.turn]), [['received', contract.id, idA, 1, 'codex', live.turn], ['received', contract.id, idA, 2, 'codex', live.turn], ['received', contract.id, idA, 1, 'codex', live.turn]]);
    assert.equal(await countRecent(join(state, 'rooms', idA), contract.id, 'read'), 3);
    // Salas counts the readings from the serving room's lines; the card of B says what it read.
    const traffic = (await (await fetch(`http://127.0.0.1:${portA}/api/salas`)).json()).enlaces.find((one) => one.id === contract.id).traffic;
    assert.equal(traffic.reads24h, 3);
    assert.equal(traffic.reads1h, 3);
    assert.ok(Number.isFinite(Date.parse(traffic.lastAt)));
    assert.deepEqual([traffic.lastAgent, traffic.lastRoom], ['codex', idB], 'Salas says who read last, and from which room');
    const cardB = (await (await fetch(`http://127.0.0.1:${portB}/api/extensions`)).json()).extensions.find((one) => one.id === 'enlaces');
    assert.deepEqual(cardB.status, { installed: true, detail: 'on · one connection lets this project read · 3 readings in 24 h' });
    assert.equal(cardB.summary, hostWords('What other projects know, when a signed connection lets this project read it. Read-only; nothing leaves this Mac.'));

    // ---- The tools, in process, as the agent would see them.
    const roomsSeen = await callTool('enlace_rooms', {}, { env });
    assert.equal(roomsSeen, `- ${nameA} · decision, fact · no expiry · open`);
    const found = await callTool('enlace_search', { room: nameA, query: 'webhook signatures', limit: 1 }, { env });
    assert.equal(found, `- [${nameA} · decision · hold · #1] Webhook signatures are verified before parsing.`);
    assert.match(await callTool('enlace_search', { room: nameA, kinds: ['fact'] }, { env }), new RegExp(`^- \\[${nameA} · fact · hold · #1\\] The client of record is Globex\\.$`));
    // Words that match nothing still bring the latest (the search is memory_search's, fallback and
    // all, 3b); the sentence for an empty answer is said when the serving room has nothing to give.
    const empty = async (url, init) => new Response(JSON.stringify({ from: 'phobos', contract: 'c', notes: [], asked: JSON.parse(init.body) }), { status: 200 });
    assert.equal(await callTool('enlace_search', { room: 'phobos', query: 'nothing of the sort xyzzy' }, { env, fetchImpl: empty }), 'Room phobos has no note that matches "nothing of the sort xyzzy" right now.');
    assert.equal(await callTool('enlace_search', { room: 'phobos', kinds: ['fact', 'rumour'] }, { env, fetchImpl: empty }), 'Room phobos has no note of kind fact that travels right now.');
    assert.equal(await callTool('enlace_search', { room: 'phobos', kinds: ['rumour'] }, { env, fetchImpl: empty }), 'Nothing was read: a kind is one of decision, fact, preference, question.');
    assert.equal(await callTool('enlace_search', { room: nameA, kinds: ['question'] }, { env }), 'Nothing was read: This connection lets this project read only: decision, fact.');
    assert.equal(await callTool('enlace_search', {}, { env }), 'Say which room to read from; enlace_rooms lists them.');
    assert.equal(await callTool('enlace_search', { room: nameB }, { env: { ...env, PULSE_ENLACES_ROOM: idA } }), `Nothing was read: ${NO_SUCH_LINK}`);
    const rpc = await handleRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'enlace_search', arguments: { room: nameA, limit: 1 } } }, { env });
    assert.equal(rpc.result.isError, false);
    assert.match(rpc.result.content[0].text, new RegExp(`^- \\[${nameA} · fact`));
    assert.equal((await handleRequest({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'memory_note', arguments: {} } }, { env })).error.code, -32602);
    assert.equal(await countRecent(join(state, 'rooms', idA), contract.id, 'read'), 6);

    // ---- The source asleep: nothing is asked of a room that is not there.
    const mark = join(state, 'rooms', idA, 'open.json');
    const wasOpen = await readFile(mark, 'utf8');
    await writeFile(mark, JSON.stringify({ ...JSON.parse(wasOpen), pid: 2 ** 22 + 12345 }));
    const asleep = await ask({ room: nameA });
    assert.equal(asleep.status, 409);
    assert.match((await asleep.json()).error, /asleep/);
    assert.equal(await callTool('enlace_rooms', {}, { env }), `- ${nameA} · decision, fact · no expiry · asleep (ask the human to wake it from Salas)`);
    await writeFile(mark, wasOpen);
    assert.equal((await ask({ room: nameA, limit: 1 })).status, 200);

    // ---- A notice is a line of one of two types, from a process holding the key; anything else is refused.
    assert.equal((await post(portB, '/api/enlace/notice', { type: 'enlace.signed', payload: { contract } }, {})).status, 403, 'a notice without the key');
    assert.equal((await post(portB, '/api/enlace/notice', { type: 'enlace.signed', payload: { contract } }, { ...channel, ...page(portB) })).status, 403, 'a notice from a page');
    assert.equal((await post(portB, '/api/enlace/notice', { type: 'enlace.signed', payload: { contract } }, { ...channel, ...phone })).status, 403, 'a notice from a phone');
    for (const bad of [{ type: 'message.created', payload: { text: 'hi' } }, { type: 'enlace.read', payload: {} }, { type: 'enlace.signed', payload: 'words' }, { type: 'enlace.signed' }]) {
      assert.equal((await post(portB, '/api/enlace/notice', bad, channel)).status, 422, `a notice of ${bad.type} with ${JSON.stringify(bad.payload)} landed`);
    }
    assert.equal((await post(portB, '/api/enlace/notice', { type: 'enlace.revoked', payload: { contract: orderedContract, other: 'salas', otherId: salas } }, channel)).status, 202);
    assert.deepEqual((await events(b, 'enlace.revoked')).map((event) => event.payload), [{ contract: orderedContract, other: 'salas', otherId: salas }]);

    // ---- Revoked from Salas: both rooms are told, and from then on there is no link.
    assert.equal((await post(portA, '/api/salas/enlaces/revoke', { id: contract.id }, phone)).status, 403);
    assert.equal((await post(portA, '/api/salas/enlaces/revoke', { id: 'ffffffffffff-ffffff' }, page(portA))).status, 404);
    const revoked = await post(portA, '/api/salas/enlaces/revoke', { id: contract.id }, page(portA));
    assert.equal(revoked.status, 200);
    assert.equal(typeof (await revoked.json()).contract.revoked, 'string');
    assert.deepEqual((await events(a, 'enlace.revoked')).map((event) => [event.payload.contract.id, event.payload.other, event.payload.otherId]), [[contract.id, nameB, idB]]);
    assert.deepEqual((await events(b, 'enlace.revoked')).at(-1).payload.contract.id, contract.id);
    assert.deepEqual(await (await ask({ room: nameA })).json(), { error: NO_SUCH_LINK });
    assert.equal(await callTool('enlace_search', { room: nameA }, { env }), `Nothing was read: ${NO_SUCH_LINK}`);
    assert.equal(await callTool('enlace_rooms', {}, { env }), 'No signed link lets this room read from another room right now.');
    // The turn ends: its tool, had it outlived it, reads nothing more: a
    // refusal for the turn, not for the link.
    held.release();
    for (let attempt = 0; attempt < 250 && (await ask({ room: nameA, limit: 1 })).status !== 409; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    const ended = await ask({ room: nameA, limit: 1 });
    assert.equal(ended.status, 409, 'a reading after its turn ended');
    assert.match((await ended.json()).error, /turn running/);
    live = null;
    assert.deepEqual(await enlaces.toolsForTurn(await ctxB(), turnB), [], 'the tool outlived its link');
    const after = await (await fetch(`http://127.0.0.1:${portA}/api/salas`)).json();
    assert.deepEqual(after.enlaces.map((one) => one.id).sort(), [orderedContract.id, plain.id].sort());
    // Revoking a second time keeps the stamp and tells nobody again.
    assert.equal((await post(portA, '/api/salas/enlaces/revoke', { id: contract.id }, page(portA))).status, 200);
    assert.equal((await events(a, 'enlace.revoked')).length, 1);
    // A contract in config.json that breaks the rules of Salas is nothing to the room that serves.
    assert.equal((await fetch(`http://127.0.0.1:${portB}/api/enlace/memories?${new URLSearchParams({ contract: orderedContract.id, asking: salas })}`, { headers: channel })).status, 200);
    await updateConfig(state, { enlaces: { [orderedContract.id]: { ...orderedContract, direction: 'both' } } });
    assert.deepEqual((await (await fetch(`http://127.0.0.1:${portA}/api/salas`)).json()).enlaces.map((one) => one.id), [plain.id]);
    assert.equal((await fetch(`http://127.0.0.1:${portB}/api/enlace/memories?${new URLSearchParams({ contract: orderedContract.id, asking: salas })}`, { headers: channel })).status, 404);
  } finally {
    held?.release();
    await close(b.server);
    await close(a.server);
  }
});

test('enlaces · the module file is the MCP server when it is run: it answers tools/list and enlace_rooms over stdio', async () => {
  const state = await scratch('madre-enlaces-stdio-');
  const project = await scratch('madre-enlaces-stdio-proj-');
  const [idA, idB] = ['phobos-0123456789abcdef', 'gumball-0123456789abcdef'];
  for (const [id, name] of [[idA, 'phobos'], [idB, 'gumball']]) { await mkdir(join(project, name), { recursive: true }); await markProject(join(state, 'rooms', id), join(project, name)); }
  const contract = await signContract(state, { rooms: { a: idA, b: idB }, direction: 'a→b', kinds: ['decision'], expires: '2030-01-01' });
  const child = spawn(process.execPath, [SELF], { env: { ...process.env, PULSE_HOME: state, PULSE_ENLACES_ROOM: idB, PULSE_ENLACES_PORT: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { out += chunk; });
  child.stderr.on('data', (chunk) => { err += chunk; });
  const done = new Promise((resolve) => child.on('close', resolve));
  child.stdin.write([
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'enlace_rooms', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'enlace_search', arguments: { room: 'phobos' } } }),
    '',
  ].join('\n'));
  child.stdin.end();
  const code = await done;
  assert.equal(code, 0, `the server did not end cleanly: ${err}`);
  // The server answers calls as they finish, not as they came (CI of 1.0.0 saw 4 before 3): JSON-RPC
  // pairs them by id, and so does this.
  const replies = out.trim().split('\n').map((line) => JSON.parse(line)).sort((a, b) => a.id - b.id);
  assert.deepEqual(replies.map((reply) => reply.id), [1, 2, 3, 4]);
  assert.equal(replies[0].result.serverInfo.name, SERVER_NAME);
  assert.deepEqual(replies[1].result.tools.map((tool) => tool.name), ENLACE_TOOLS);
  assert.equal(replies[2].result.content[0].text, `- phobos · decision · until 2030-01-01 · asleep (ask the human to wake it from Salas)`);
  // Port 1 answers nobody: the tool says so, as a sentence, and the server does not die of it.
  assert.equal(replies[3].result.content[0].text, 'Nothing was read: this room did not answer.');
  assert.equal(replies[3].result.isError, false);
  assert.equal(contract.rooms.a, idA);
});

test('enlaces · D-S15: the Coordinator learns from a project only while you allow it, takes all it knows, keeps the last copy if it sleeps, and forgets it when you stop', async () => {
  const state = await scratch('madre-enlaces-train-');
  const projectA = await realpath(await scratch('madre-enlaces-train-a-'));
  await mkdir(salasProjectRoot(state), { recursive: true });
  const a = await createPulseServer({ projectRoot: projectA, stateRoot: state, agents: roster, invokers: {} });
  const s = await createPulseServer({ projectRoot: salasProjectRoot(state), stateRoot: state, agents: roster, invokers: {} });
  const portA = await listen(a.server);
  await a.markOpen(portA);
  const portS = await listen(s.server);
  await s.markOpen(portS);
  const [idA, salas] = [projectRoomId(projectA), salasRoomId(state)];
  const post = (port, path, payload, headers = {}) => fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
  const page = { origin: `http://127.0.0.1:${portS}` };
  const channel = { [CHANNEL_HEADER]: await channelKey(state) };
  try {
    const memory = await new RoomMemory(join(state, 'rooms', idA, 'memory.sqlite')).initialize();
    memory.addMemories(Array.from({ length: 30 }, (_, i) => ({ kind: i % 2 ? 'fact' : 'decision', text: `Decision number ${i} of the project, recorded with enough words to be learned.`, sources: [1] })), { agent: 'codex', fromSequence: 1, throughSequence: 1 });
    memory.addMemories([{ kind: 'question', text: 'A question not signed into the link.', sources: [1] }], { agent: 'codex', fromSequence: 2, throughSequence: 2 });
    memory.close();
    // Signed by a process (BISHOP's road) the box is ignored; signed from the page it holds.
    const link = (await (await post(portS, '/api/salas/enlaces', { a: idA, b: salas, direction: 'a→b', kinds: ['decision', 'fact'], train: true }, page)).json()).contract;
    assert.equal(link.train, true);
    // The serving side: never a page, never without the key, never on a link that does not allow it.
    const corpus = (headers) => fetch(`http://127.0.0.1:${portA}/api/enlace/corpus?contract=${link.id}&asking=${salas}`, { headers });
    assert.equal((await corpus({ ...channel, origin: page.origin })).status, 403, 'a page took the corpus');
    assert.equal((await corpus({})).status, 403, 'taken without the key');
    const whole = await (await corpus(channel)).json();
    assert.equal(whole.notes.length, 30, 'not everything the project knows of the signed kinds, or more than that');
    assert.ok(whole.notes.every((note) => note.kind !== 'question'), 'a kind not signed crossed');
    // The export in Salas: every allowed project, named.
    const exported = (await (await post(portS, '/api/dataset', {})).json()).dataset;
    assert.deepEqual(exported.linked.map((one) => [one.room, one.notes, one.source]), [[idA, 30, 'live']]);
    // Asleep: the copy kept the last time it answered is used, and said so.
    await close(a.server);
    const asleep = (await (await post(portS, '/api/dataset', {})).json()).dataset;
    assert.deepEqual(asleep.linked.map((one) => [one.notes, one.source]), [[30, 'kept']]);
    // Cleared by you: the copy goes, and the next export leaves the project out.
    assert.equal((await post(portS, '/api/salas/enlaces/train', { id: link.id, train: false })).status, 403, 'changed by a process');
    assert.equal((await post(portS, '/api/salas/enlaces/train', { id: link.id, train: false }, page)).status, 200);
    const after = (await (await post(portS, '/api/dataset', {})).json()).dataset;
    assert.deepEqual(after.linked, []);
  } finally {
    await close(s.server).catch(() => {});
    await close(a.server).catch(() => {});
  }
});

test('enlaces · D-S16 and D-S17: the state of a project and the notes delivered to it, only while you allow them, and nothing in its memory until accepted', async () => {
  const state = await scratch('madre-enlaces-state-');
  const projectA = await realpath(await scratch('madre-enlaces-state-a-'));
  const projectB = await realpath(await scratch('madre-enlaces-state-b-'));
  await mkdir(join(projectA, '.ahp', 'state'), { recursive: true });
  await mkdir(join(projectA, '.ahp', 'records', 'decisions'), { recursive: true });
  await mkdir(join(projectA, '.ahp', 'handoffs'), { recursive: true });
  await writeFile(join(projectA, '.ahp', 'state', 'project.json'), JSON.stringify({ project_id: 'a', objective: 'Ship the billing rewrite', phase: 'ACTIVE', next_action: 'Review the invoices module', blockers: ['waiting for tax tables'], updated_at: '2026-10-15T10:00:00Z' }));
  await writeFile(join(projectA, '.ahp', 'records', 'decisions', 'DEC-20261015-AAAA0001.json'), JSON.stringify({ id: 'DEC-20261015-AAAA0001', title: 'Invoices in UTC', description: 'Every invoice is stamped in UTC.', status: 'ACCEPTED', updated_at: '2026-10-15T09:00:00Z' }));
  await writeFile(join(projectA, '.ahp', 'handoffs', 'HOF-20261015-AAAA0002.json'), JSON.stringify({ id: 'HOF-20261015-AAAA0002', from: 'codex', to: 'claude', objective: 'Ship the billing rewrite', git: { branch: 'main', commit: 'abc' }, relevant_files: ['src/secret.js'], pending: ['tests for refunds'], decisions: ['DEC-20261015-AAAA0001'], next_action: 'Write the refund tests', created_at: '2026-10-15T11:00:00Z' }));
  await mkdir(salasProjectRoot(state), { recursive: true });
  const a = await createPulseServer({ projectRoot: projectA, stateRoot: state, agents: roster, invokers: {} });
  const b = await createPulseServer({ projectRoot: projectB, stateRoot: state, agents: roster, invokers: {} });
  const s = await createPulseServer({ projectRoot: salasProjectRoot(state), stateRoot: state, agents: roster, invokers: {} });
  const [portA, portB, portS] = [await listen(a.server), await listen(b.server), await listen(s.server)];
  await a.markOpen(portA); await b.markOpen(portB); await s.markOpen(portS);
  const [idA, idB] = [projectRoomId(projectA), projectRoomId(projectB)];
  const post = (port, path, payload, headers = {}) => fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
  const page = { origin: `http://127.0.0.1:${portS}` };
  const pageA = { origin: `http://127.0.0.1:${portA}` };
  const channel = { [CHANNEL_HEADER]: await channelKey(state) };
  try {
    // Signed by a process the two boxes are ignored; signed from the page they hold.
    const link = (await (await post(portS, '/api/salas/enlaces', { a: idA, b: idB, direction: 'a→b', kinds: ['decision', 'fact'], state: true, deliver: true }, page)).json()).contract;
    assert.deepEqual([link.state, link.deliver], [true, true]);

    // D-S16 · the state: the doors of a reading, the canonical state and nothing of the code.
    const read = (headers, asking = idB) => fetch(`http://127.0.0.1:${portA}/api/enlace/state?contract=${link.id}&asking=${asking}`, { headers });
    assert.equal((await read({ ...channel, origin: page.origin })).status, 403, 'a page read the state');
    assert.equal((await read({})).status, 403, 'read without the key');
    assert.equal((await read(channel, salasRoomId(state))).status, 404, 'a room outside the link read it');
    const shared = await (await read(channel)).json();
    assert.equal(shared.state.project.objective, 'Ship the billing rewrite');
    assert.deepEqual(shared.state.decisions.map((one) => one.title), ['Invoices in UTC']);
    assert.deepEqual(shared.state.handoff.decisions, ['Invoices in UTC'], 'the handoff names decisions by title, not by id');
    assert.ok(!JSON.stringify(shared).includes('secret.js') && !('git' in shared.state.handoff), 'files or git crossed');
    assert.equal((await events(a, 'enlace.state')).length, 1);

    // D-S17 · a delivery goes against the arrow: B reads A, so B may hand notes to A.
    const deliver = (port, from, notes) => post(port, '/api/enlace/deliver', { contract: link.id, from, agent: 'codex', notes }, channel);
    assert.equal((await deliver(portB, idA, [{ kind: 'fact', text: 'Wrong way round.' }])).status, 404, 'delivered along the arrow');
    assert.equal((await deliver(portA, idB, [{ kind: 'aberration', text: 'Not knowledge.' }])).status, 422);
    assert.equal((await post(portA, '/api/enlace/deliver', { contract: link.id, from: idB, notes: [{ kind: 'fact', text: 'x' }] }, { ...channel, origin: pageA.origin })).status, 403, 'a page delivered');
    const sent = await (await deliver(portA, idB, [{ kind: 'decision', text: 'Refunds keep the original currency.', why: 'B decided it for both' }, { kind: 'fact', text: 'B ships on Fridays.' }])).json();
    assert.equal(sent.accepted, 2);
    const inbox = (await (await fetch(`http://127.0.0.1:${portA}/api/enlace/inbox`)).json()).notes;
    assert.deepEqual(inbox.map((note) => note.status), ['pending', 'pending']);
    // Nothing is in the memory yet.
    const before = (await new RoomMemory(join(state, 'rooms', idA, 'memory.sqlite')).initialize());
    assert.ok(!before.memories({ limit: 50 }).some((note) => /Refunds keep/.test(note.text)), 'a delivered note entered the memory on its own');
    before.close();
    // A process without a running turn decides nothing; you do, from the page.
    const [first, second] = sent.ids;
    assert.equal((await post(portA, '/api/enlace/inbox/decide', { id: first, accept: true }, channel)).status, 409);
    assert.equal((await post(portA, '/api/enlace/inbox/decide', { id: first, accept: true }, pageA)).status, 200);
    assert.equal((await post(portA, '/api/enlace/inbox/decide', { id: first, accept: true }, pageA)).status, 404, 'decided twice');
    assert.equal((await post(portA, '/api/enlace/inbox/decide', { id: second, accept: false }, pageA)).status, 200);
    const after = await new RoomMemory(join(state, 'rooms', idA, 'memory.sqlite')).initialize();
    const notes = after.memories({ limit: 50 });
    after.close();
    assert.ok(notes.some((note) => /Refunds keep the original currency/.test(note.text) && note.origin === 'delivered'), 'the accepted note is not in the memory');
    assert.ok(!notes.some((note) => /ships on Fridays/.test(note.text)), 'a declined note entered the memory');
    assert.equal((await events(a, 'enlace.accepted')).length, 1);

    // Cleared by you, from Home only: the state and the deliveries stop.
    assert.equal((await post(portS, '/api/salas/enlaces/allow', { id: link.id, field: 'state', on: false })).status, 403, 'changed by a process');
    assert.equal((await post(portS, '/api/salas/enlaces/allow', { id: link.id, field: 'state', on: false }, page)).status, 200);
    assert.equal((await post(portS, '/api/salas/enlaces/allow', { id: link.id, field: 'deliver', on: false }, page)).status, 200);
    assert.equal((await read(channel)).status, 404);
    assert.equal((await deliver(portA, idB, [{ kind: 'fact', text: 'Too late.' }])).status, 404);
  } finally {
    for (const one of [a, b, s]) await close(one.server).catch(() => {});
  }
});
