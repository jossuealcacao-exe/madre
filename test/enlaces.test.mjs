import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { RoomMemory, RECALLED_ZONES } from '../src/memory.mjs';
import { Privacy, PRIVACY_MARKER } from '../src/privacy.mjs';
import { Room } from '../src/room.mjs';
import { loadConfig, updateConfig } from '../src/config.mjs';
import { markProject, projectRoomId as projectRoomIdOfSalas, salasProjectRoot, salasRoomId } from '../src/salas.mjs';
import { createPulseServer, projectRoomId } from '../src/server.mjs';
import { callTool, openMemory } from '../src/mcp/memory-server.mjs';
import { phonePolicy } from '../src/bridge/policy.mjs';
import { summary as vaultSummary } from '../src/vault.mjs';
import { hostWords } from '../src/i18n.mjs';
import {
  CHANNEL_HEADER, NO_SUCH_LINK, activeContracts, askEnlace, channelKey, channelKeyFile, channelKeySummary, contractId, countRecent,
  linkTraffic, mayServe, normalizeContract, noteCrossing, readsFrom, receivesOrders, revokeContract, sameKey, servingRooms, signContract, trainContract,
} from '../src/enlaces.mjs';

// ENLACES (docs/MACROVERSO.md, phase 3b): the contract two rooms sign, the key of the channel,
// the locks in the room that serves, and the counters of what crossed. Nothing here writes in
// another room.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];

test('enlaces · a contract is whole or it is nothing: two rooms, a direction, standing kinds, fixed zones, orders under #2', () => {
  const rooms = { a: 'phobos-0123456789abcdef', b: 'gumball-0123456789abcdef' };
  const now = new Date('2026-10-08T12:00:00Z');
  const contract = normalizeContract({ rooms, direction: 'a→b', kinds: ['fact', 'decision', 'fact'], expires: '2026-11-30', orders: { allowed: true, maxMode: 2, perHour: 3 } }, { now });
  assert.match(contract.id, /^[0-9a-f]{12}-[0-9a-f]{6}$/);
  assert.equal(contract.id.slice(0, 12), contractId(rooms).slice(0, 12), 'the id is not stable for the pair');
  assert.equal(contractId({ a: rooms.b, b: rooms.a }).slice(0, 12), contract.id.slice(0, 12), 'the pair is the pair whichever way it is written');
  assert.notEqual(contractId(rooms), contractId(rooms), 'the nonce is missing');
  assert.deepEqual(contract.kinds, ['decision', 'fact']);
  assert.deepEqual(contract.zones, RECALLED_ZONES, 'what crosses is what travels into a turn: cited, not copied');
  assert.deepEqual(contract.orders, { allowed: true, maxMode: 2, perHour: 3 });
  assert.deepEqual(contract.signed, { at: now.toISOString(), by: 'you' });
  assert.equal(contract.expires, '2026-11-30T00:00:00.000Z');
  assert.equal(contract.revoked, null);
  assert.deepEqual(Object.keys(contract), ['id', 'rooms', 'direction', 'kinds', 'zones', 'expires', 'revoked', 'orders', 'signed', 'recall', 'train', 'state', 'deliver']);
  assert.equal(contract.train, false, 'D-S15: the Coordinator learns from nobody unless ticked');
  assert.equal(contract.recall, false, '3e: off unless ticked');
  assert.equal(normalizeContract({ rooms, direction: 'both', kinds: ['fact'], recall: true }).recall, true);
  assert.throws(() => normalizeContract({ rooms, direction: 'both', kinds: ['fact'], recall: 'yes' }), /recall can only be on or off/);
  // Defaults: orders off, #1, six an hour. The zones may be stated only as they are.
  const plain = normalizeContract({ rooms, direction: 'both', kinds: ['question'], zones: ['bridge', 'hold'] });
  assert.deepEqual(plain.orders, { allowed: false, maxMode: 1, perHour: 6 });
  assert.deepEqual(plain.zones, RECALLED_ZONES);
  // The same contract again keeps its id; an id that belongs to another pair is refused.
  assert.equal(normalizeContract(contract).id, contract.id);
  assert.throws(() => normalizeContract({ ...contract, rooms: { a: rooms.a, b: 'other-0123456789abcdef' } }), /does not belong/);
  for (const [bad, why] of [
    [{ rooms: { a: rooms.a, b: rooms.a }, direction: 'both', kinds: ['fact'] }, /itself/],
    [{ rooms: { a: rooms.a }, direction: 'both', kinds: ['fact'] }, /two rooms/],
    [{ rooms, direction: 'sideways', kinds: ['fact'] }, /direction/],
    [{ rooms, direction: 'both', kinds: [] }, /kinds/],
    [{ rooms, direction: 'both', kinds: ['fact', 'aberration'] }, /doubtful memory never crosses/],
    [{ rooms, direction: 'both', kinds: ['rumour'] }, /not a kind/],
    [{ rooms, direction: 'both', kinds: ['fact'], zones: ['hold'] }, /not configurable/],
    [{ rooms, direction: 'both', kinds: ['fact'], zones: ['hold', 'bridge', 'medbay'] }, /not configurable/],
    [{ rooms, direction: 'both', kinds: ['fact'], zones: 'everything' }, /not configurable/],
    [{ rooms, direction: 'both', kinds: ['fact'], orders: { maxMode: 3 } }, /never passes #2/],
    [{ rooms, direction: 'both', kinds: ['fact'], orders: { maxMode: -1 } }, /maxMode/],
    [{ rooms, direction: 'both', kinds: ['fact'], orders: { perHour: 0 } }, /perHour/],
    [{ rooms, direction: 'both', kinds: ['fact'], expires: 'someday' }, /not a date/],
    [{ rooms, direction: 'both', kinds: ['fact'], signed: { by: 'codex' } }, /Only you or the Coordinator/],
    // D-S13: BISHOP signs only a link to read that expires within a week.
    [{ rooms, direction: 'both', kinds: ['fact'], signed: { by: 'bishop' } }, /within 7 days/],
    [{ rooms, direction: 'both', kinds: ['fact'], id: 'nope' }, /not a link id/],
    [null, /object/],
  ]) assert.throws(() => normalizeContract(bad), why);
});

test('enlaces · revoked or expired is the same as never signed, and the arrow says who serves whom', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const [a, b] = ['phobos-0123456789abcdef', 'gumball-0123456789abcdef'];
  const live = normalizeContract({ rooms: { a, b }, direction: 'a→b', kinds: ['decision'] }, { now });
  const both = normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['decision'] }, { now });
  const gone = normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['decision'], expires: '2026-10-08T11:00:00Z' }, { now });
  const cut = normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['decision'], revoked: '2026-10-08T11:00:00Z' }, { now });
  const config = { enlaces: { [live.id]: live, [both.id]: both, [gone.id]: gone, [cut.id]: cut, 'not-an-id': { rooms: { a, b } }, [contractId({ a, b })]: { ...live, id: 'mismatch' }, [contractId({ a, b })]: null } };
  assert.deepEqual(activeContracts(config, { now }).map((one) => one.id).sort(), [live.id, both.id].sort());
  assert.deepEqual(activeContracts({}, { now }), []);
  assert.deepEqual(activeContracts({ enlaces: [] }, { now }), []);
  // `a→b`: notes travel from a to b, so a serves b and never the other way round.
  assert.deepEqual(mayServe({ contract: live, serving: a, asking: b, now }), { ok: true });
  assert.equal(mayServe({ contract: live, serving: b, asking: a, now }).why, 'direction');
  assert.deepEqual(mayServe({ contract: both, serving: b, asking: a, now }), { ok: true });
  assert.equal(mayServe({ contract: both, serving: a, asking: 'stranger-0123456789abcdef', now }).why, 'not-a-party');
  assert.equal(mayServe({ contract: both, serving: 'stranger-0123456789abcdef', asking: b, now }).why, 'not-a-party');
  assert.equal(mayServe({ contract: both, serving: a, asking: a, now }).why, 'not-a-party');
  assert.equal(mayServe({ contract: gone, serving: a, asking: b, now }).why, 'expired');
  assert.equal(mayServe({ contract: cut, serving: a, asking: b, now }).why, 'revoked');
  assert.equal(mayServe({ contract: null, serving: a, asking: b, now }).why, 'no-contract');
  // The moment it expires it is not: the same contract, a minute before and a minute after.
  const soon = normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['decision'], expires: '2026-10-08T12:30:00Z' }, { now });
  assert.deepEqual(mayServe({ contract: soon, serving: a, asking: b, now: new Date('2026-10-08T12:29:00Z') }), { ok: true });
  assert.equal(mayServe({ contract: soon, serving: a, asking: b, now: new Date('2026-10-08T12:30:00Z') }).why, 'expired');
});

test('enlaces · the room of Salas never serves, orders need it at one end, and signing with orders asks for the designation of the room that will take them (fase 3c)', async () => {
  const state = await scratch('madre-enlaces-salas-');
  // The id of the room of Salas is the id any project in ~/.pulse/salas would have, computed once
  // (src/salas.mjs) whether or not that room exists yet; the server re-exports the same function.
  assert.equal(salasProjectRoot(state), join(state, 'salas'));
  assert.equal(salasRoomId(state), projectRoomId(join(await realpath(state), 'salas')), 'the id is not the one the server would give that folder');
  assert.equal(projectRoomIdOfSalas, projectRoomId, 'the server and Salas name a folder with two different functions');
  const salas = salasRoomId(state);
  // The same id before and after the notebook exists, and through a link in the path (tmpdir on a Mac).
  await mkdir(salasProjectRoot(state), { recursive: true });
  assert.equal(salasRoomId(state), salas);
  assert.equal(salasRoomId(state), projectRoomId(await realpath(salasProjectRoot(state))));
  assert.equal(salasRoomId(join(state, 'no-such-home')), projectRoomId(join(state, 'no-such-home', 'salas')), 'a home that is not there yet still has an id');
  const [a, b] = ['phobos-0123456789abcdef', 'gumball-0123456789abcdef'];
  const now = new Date('2026-10-08T12:00:00Z');
  // Without the id of that room the rules cannot apply, and the contract is as it was in 3b.
  assert.equal(normalizeContract({ rooms: { a: salas, b }, direction: 'a→b', kinds: ['fact'], orders: { allowed: true } }, { now }).orders.allowed, true);
  // With it: that room serves nobody, whichever end it sits at, whichever way the arrow points.
  for (const [rooms, direction] of [[{ a: salas, b }, 'a→b'], [{ a: salas, b }, 'both'], [{ a, b: salas }, 'b→a'], [{ a, b: salas }, 'both']]) {
    assert.throws(() => normalizeContract({ rooms, direction, kinds: ['fact'] }, { now, salas }), /never shares through a connection/, `${direction} from ${rooms.a === salas ? 'a' : 'b'}`);
  }
  // It may read from anyone.
  const reads = normalizeContract({ rooms: { a, b: salas }, direction: 'a→b', kinds: ['decision', 'fact'] }, { now, salas });
  assert.deepEqual(servingRooms(reads), [a]);
  assert.equal(receivesOrders(reads, salas), null, 'orders not allowed, yet a room would take them');
  // Orders only on a link with that room at one end, and then the other end is the one that takes them.
  assert.throws(() => normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['fact'], orders: { allowed: true } }, { now, salas }), /need the Coordinator at one end/);
  const ordered = normalizeContract({ rooms: { a: salas, b }, direction: 'b→a', kinds: ['fact'], orders: { allowed: true, maxMode: 2 } }, { now, salas });
  assert.equal(receivesOrders(ordered, salas), b);
  assert.equal(receivesOrders(normalizeContract({ rooms: { a, b: salas }, direction: 'a→b', kinds: ['fact'], orders: { allowed: true } }, { now, salas }), salas), a);
  assert.deepEqual(servingRooms(normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['fact'] })), [a, b]);
  assert.deepEqual(servingRooms(normalizeContract({ rooms: { a, b }, direction: 'b→a', kinds: ['fact'] })), [b]);
  // A contract already in config.json that breaks either rule is a link that does not exist.
  const plain = normalizeContract({ rooms: { a, b }, direction: 'a→b', kinds: ['decision'] }, { now });
  const config = { enlaces: { [reads.id]: reads, [ordered.id]: ordered, [plain.id]: plain, [contractId({ a: salas, b })]: { ...normalizeContract({ rooms: { a: salas, b }, direction: 'both', kinds: ['fact'] }, { now }) }, [contractId({ a, b })]: { ...normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['fact'], orders: { allowed: true } }, { now }) } } };
  for (const [id, entry] of Object.entries(config.enlaces)) entry.id = id;
  assert.equal(activeContracts(config, { now }).length, 5, 'without the id of Salas every well-formed contract stands');
  assert.deepEqual(activeContracts(config, { now, salas }).map((one) => one.id).sort(), [reads.id, ordered.id, plain.id].sort());
  // What lets a room read, with the room it reads from: what the module, the tool and the asking side all ask.
  assert.deepEqual(readsFrom(activeContracts(config, { now, salas }), salas, { now }).map((one) => [one.contract.id, one.from]).sort(), [[reads.id, a], [ordered.id, b]].sort());
  assert.deepEqual(readsFrom(activeContracts(config, { now, salas }), b, { now }).map((one) => [one.contract.id, one.from]), [[plain.id, a]]);
  assert.deepEqual(readsFrom(activeContracts(config, { now, salas }), a, { now }), []);

  // Signing: the designation is the NAME of the room that will take orders, whichever letters.
  // Known means its folder is on disk (S-004): the notebook of Salas is made by `madre salas` (3d).
  const project = await scratch('madre-enlaces-salas-proj-');
  for (const folder of [join(project, 'Phobos'), join(project, 'gumball')]) await mkdir(folder, { recursive: true });
  await markProject(join(state, 'rooms', a), join(project, 'Phobos'));
  await markProject(join(state, 'rooms', b), join(project, 'gumball'));
  await markProject(join(state, 'rooms', salas), salasProjectRoot(state));
  const raw = { rooms: { a: salas, b }, direction: 'b→a', kinds: ['fact'], orders: { allowed: true } };
  await assert.rejects(signContract(state, raw, { salas }), { code: 'DESIGNATION' });
  await assert.rejects(signContract(state, raw, { salas, designation: 'phobos' }), { code: 'DESIGNATION' });
  await assert.rejects(signContract(state, raw, { salas, designation: b }), { code: 'DESIGNATION' }, 'the id passed for the name');
  const signed = await signContract(state, raw, { salas, designation: '  GUMBALL ' });
  assert.equal(signed.orders.allowed, true);
  // Without orders no designation is asked; a room this Mac does not know says so with its code.
  const noOrders = await signContract(state, { rooms: { a, b: salas }, direction: 'a→b', kinds: ['fact'] }, { salas });
  assert.equal(noOrders.orders.allowed, false);
  await assert.rejects(signContract(state, { rooms: { a, b: 'nowhere-0123456789abcdef' }, direction: 'a→b', kinds: ['fact'] }, { salas }), { code: 'UNKNOWN_ROOM' });
  await assert.rejects(signContract(state, { rooms: { a: salas, b }, direction: 'both', kinds: ['fact'] }, { salas }), /never shares through a connection/);
  // The rooms may be handed in as `knownRooms` lists them, names included, or as bare ids (3b).
  const rooms = [{ id: a, name: 'Phobos' }, { id: salas, name: 'salas' }];
  // Two projects are connected once (2026-10-11): the pair is freed before it is signed again.
  await revokeContract(state, noOrders.id);
  await assert.rejects(signContract(state, { rooms: { a: salas, b: a }, direction: 'b→a', kinds: ['fact'], orders: { allowed: true } }, { salas, rooms, designation: 'gumball' }), { code: 'DESIGNATION' });
  assert.equal((await signContract(state, { rooms: { a: salas, b: a }, direction: 'b→a', kinds: ['fact'], orders: { allowed: true } }, { salas, rooms, designation: 'PHOBOS' })).rooms.b, a);
  assert.equal((await signContract(state, { rooms: { a, b }, direction: 'both', kinds: ['fact'] }, { salas, rooms: [a, b] })).direction, 'both');
  assert.equal(Object.keys((await loadConfig(state)).enlaces).length, 4);
});

test('enlaces · the traffic of a link is read from the lines beside the serving room\'s record: a day, an hour, and the latest', async () => {
  const dirA = await scratch('madre-enlaces-traffic-a-');
  const dirB = await scratch('madre-enlaces-traffic-b-');
  const now = new Date('2026-10-08T12:00:00Z');
  const id = 'aaaaaaaaaaaa-000001';
  await noteCrossing(dirA, { kind: 'read', contract: id, other: 'b', count: 2, now: new Date('2026-10-07T13:00:00Z') });   // 23 h ago
  await noteCrossing(dirA, { kind: 'read', contract: id, other: 'b', count: 1, now: new Date('2026-10-08T11:30:00Z') });   // 30 min ago
  await noteCrossing(dirA, { kind: 'read', contract: id, other: 'b', count: 1, now: new Date('2026-10-06T12:00:00Z') });   // two days ago
  await noteCrossing(dirA, { kind: 'received', contract: id, other: 'b', count: 1, now });                                  // not a reading
  await noteCrossing(dirA, { kind: 'read', contract: 'bbbbbbbbbbbb-000001', other: 'c', count: 1, now });                   // another link
  await noteCrossing(dirB, { kind: 'read', contract: id, other: 'a', count: 3, now: new Date('2026-10-08T11:45:00Z') });   // the other end of a link both ways
  // S-021: the latest reading also says who read it, when the asking room said so, and from where.
  assert.deepEqual(await linkTraffic([dirA], id, { now }), { reads24h: 2, reads1h: 1, lastAt: '2026-10-08T11:30:00.000Z', lastAgent: null, lastRoom: 'b' });
  assert.deepEqual(await linkTraffic([dirA, dirB], { id }, { now }), { reads24h: 3, reads1h: 2, lastAt: '2026-10-08T11:45:00.000Z', lastAgent: null, lastRoom: 'a' });
  assert.deepEqual(await linkTraffic([join(dirA, 'nowhere')], id, { now }), { reads24h: 0, reads1h: 0, lastAt: null, lastAgent: null, lastRoom: null });
  await noteCrossing(dirB, { kind: 'read', contract: id, other: 'a', count: 1, agent: 'claude', turn: 't-9', now: new Date('2026-10-08T11:50:00Z') });
  assert.deepEqual(await linkTraffic([dirB], id, { now }), { reads24h: 2, reads1h: 2, lastAt: '2026-10-08T11:50:00.000Z', lastAgent: 'claude', lastRoom: 'a' });
  assert.deepEqual(await linkTraffic([], id, { now }), { reads24h: 0, reads1h: 0, lastAt: null, lastAgent: null, lastRoom: null });
});

test('enlaces · signing writes one key of config.json: two rooms signing at once keep both; revoking stamps and never deletes (S-001, S-007)', async () => {
  const state = await scratch('madre-enlaces-config-');
  const project = await scratch('madre-enlaces-proj-');
  const rooms = ['phobos-0123456789abcdef', 'gumball-0123456789abcdef', 'nostromo-0123456789abcdef'];
  for (const id of rooms) await markProject(join(state, 'rooms', id), project);   // asleep, and known
  const [one, two] = await Promise.all([
    signContract(state, { rooms: { a: rooms[0], b: rooms[1] }, direction: 'both', kinds: ['fact'] }),
    signContract(state, { rooms: { a: rooms[1], b: rooms[2] }, direction: 'b→a', kinds: ['decision', 'question'] }),
  ]);
  let config = await loadConfig(state);
  assert.deepEqual(Object.keys(config.enlaces).sort(), [one.id, two.id].sort(), 'a room wrote over the other room\'s link');
  assert.deepEqual(config.enlaces[two.id], two);
  assert.deepEqual((await readdir(state)).sort(), ['config.json', 'rooms'], 'a lock or a draft was left behind');
  // Only rooms this Mac knows, and never a link already over.
  await assert.rejects(signContract(state, { rooms: { a: rooms[0], b: 'nowhere-0123456789abcdef' }, direction: 'both', kinds: ['fact'] }), /does not know the room nowhere/);
  await assert.rejects(signContract(state, { rooms: { a: rooms[0], b: rooms[1] }, direction: 'both', kinds: ['fact'], expires: '2000-01-01' }), /already have expired/);
  await assert.rejects(signContract(state, { rooms: { a: rooms[0], b: rooms[1] }, direction: 'both', kinds: ['fact'], revoked: '2000-01-01' }), /already revoked/);
  await assert.rejects(signContract(state, { rooms: { a: rooms[0], b: rooms[1] }, direction: 'both', kinds: ['aberration'] }), /never crosses/);
  // Revoking keeps the contract with its stamp; the other one is untouched; nothing is deleted.
  const revoked = await revokeContract(state, one.id, { now: new Date('2026-10-08T12:00:00Z') });
  assert.equal(revoked.revoked, '2026-10-08T12:00:00.000Z');
  config = await loadConfig(state);
  assert.deepEqual(config.enlaces[one.id], { ...one, revoked: '2026-10-08T12:00:00.000Z' });
  assert.deepEqual(config.enlaces[two.id], two);
  assert.deepEqual(activeContracts(config).map((contract) => contract.id), [two.id]);
  // A second revocation keeps the first stamp; an id nobody signed is nothing.
  assert.equal((await revokeContract(state, one.id)).revoked, '2026-10-08T12:00:00.000Z');
  assert.equal(await revokeContract(state, 'ffffffffffff-ffffff'), null);
  assert.equal(Object.keys((await loadConfig(state)).enlaces).length, 2);
});

test('enlaces · the key of the channel is made once, owner-only, whole, the same for every room that asks; of it only its name and length leave', async () => {
  const state = await scratch('madre-enlaces-key-');
  const keys = await Promise.all(Array.from({ length: 6 }, () => channelKey(state)));
  assert.match(keys[0], /^[0-9a-f]{64}$/);
  assert.ok(keys.every((key) => key === keys[0]), 'rooms making the key at once ended with different keys');
  assert.equal(await channelKey(state), keys[0]);
  const file = channelKeyFile(state);
  assert.equal(file, join(state, 'credentials', 'enlaces.json'));
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { key: keys[0] });
  assert.deepEqual(await readdir(join(state, 'credentials')), ['enlaces.json'], 'a draft was left beside the key');
  if (process.platform !== 'win32') {
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal((await stat(join(state, 'credentials'))).mode & 0o777, 0o700);
  }
  // The same file shape as a module's secrets: the vault lists it by name and size, never value.
  assert.deepEqual(await channelKeySummary(state), { name: 'enlaces.json', bytes: 64 });
  assert.deepEqual(await vaultSummary(state), [{ module: 'enlaces', name: 'key', bytes: 64 }]);
  assert.ok(!JSON.stringify([await channelKeySummary(state), await vaultSummary(state)]).includes(keys[0]));
  // Compared in constant time, and never a throw on a header that is not there.
  assert.equal(sameKey(keys[0], keys[0]), true);
  assert.equal(sameKey(keys[0], keys[0].replace(/^./, (first) => (first === 'a' ? 'b' : 'a'))), false);
  assert.equal(sameKey(keys[0], keys[0].slice(1)), false);
  assert.equal(sameKey(undefined, keys[0]), false);
  assert.equal(sameKey('', ''), false);
  // A file that is not a key is an error, not a key of nothing.
  await writeFile(file, '{"key":"short"}\n');
  await assert.rejects(channelKey(state), /does not hold a key/);
  assert.equal(await channelKeySummary(state), null);
});

test('enlaces · a crossing is one line beside the record, and the hourly count reads only that contract, that kind, that hour', async () => {
  const roomDir = await scratch('madre-enlaces-crossings-');
  const now = new Date('2026-10-08T12:00:00Z');
  await noteCrossing(roomDir, { kind: 'read', contract: 'aaaaaaaaaaaa-000001', other: 'b', count: 3, now: new Date('2026-10-08T11:30:00Z') });
  await noteCrossing(roomDir, { kind: 'read', contract: 'aaaaaaaaaaaa-000001', other: 'b', count: 0, now: new Date('2026-10-08T10:30:00Z') });
  await noteCrossing(roomDir, { kind: 'received', contract: { id: 'aaaaaaaaaaaa-000001' }, other: 'b', count: 2, now });
  await noteCrossing(roomDir, { kind: 'read', contract: 'bbbbbbbbbbbb-000001', other: 'c', count: 1, now });
  await writeFile(join(roomDir, 'enlaces.jsonl'), 'not json\n', { flag: 'a' });   // a torn line is skipped, never fatal
  assert.equal(await countRecent(roomDir, 'aaaaaaaaaaaa-000001', 'read', { now }), 1);
  assert.equal(await countRecent(roomDir, { id: 'aaaaaaaaaaaa-000001' }, 'received', { now }), 1);
  assert.equal(await countRecent(roomDir, 'aaaaaaaaaaaa-000001', 'read', { now, sinceMs: 3 * 60 * 60 * 1000 }), 2);
  assert.equal(await countRecent(roomDir, 'bbbbbbbbbbbb-000001', 'read', { now }), 1);
  assert.equal(await countRecent(join(roomDir, 'nowhere'), 'aaaaaaaaaaaa-000001', 'read', { now }), 0);
  const lines = (await readFile(join(roomDir, 'enlaces.jsonl'), 'utf8')).trim().split('\n');
  assert.deepEqual(JSON.parse(lines[0]), { at: '2026-10-08T11:30:00.000Z', kind: 'read', contract: 'aaaaaaaaaaaa-000001', other: 'b', count: 3 });
  await assert.rejects(noteCrossing(roomDir, { kind: 'wrote', contract: 'x' }), /one of read, received/);
  await assert.rejects(noteCrossing(roomDir, { kind: 'read' }), /names its contract/);
});

test('enlaces · S-008: a note an agent saves with memory_note passes the privacy guard, like everything else', async () => {
  const state = await scratch('madre-enlaces-s008-');
  await updateConfig(state, { privacy: { terms: ['Globex'] } });
  const root = await scratch('madre-enlaces-s008-room-');
  const store = await new EventStore(join(root, 'events.jsonl')).initialize();
  await store.append('message.created', { messageId: 'a', role: 'user', sender: 'you', target: 'codex', text: 'Remember who the client is.' });
  // The server as it opens for a turn: the config.json every room on this Mac shares, found by PULSE_HOME.
  const memory = await openMemory({ dbFile: join(root, 'memory.sqlite'), env: { PULSE_HOME: state, PULSE_EMBED: '0' } });
  try {
    const context = { memory, projectRoot: root, agent: 'codex', mode: '1', messageId: 'r1' };
    const reply = await callTool('memory_note', { kind: 'fact', text: 'Globex is the client of record.', sources: [1] }, context);
    assert.equal(reply, `Saved memory #1 (fact) for every future turn of this room: "${PRIVACY_MARKER} is the client of record."`, 'the tool echoed the term it was handed');
    const [note] = memory.memories();
    assert.equal(note.text, `${PRIVACY_MARKER} is the client of record.`);
    assert.ok(!JSON.stringify(memory.memories()).includes('Globex'), 'the term reached the base');
    // The dedup key is the guarded sentence: the same claim in other letters is already there.
    assert.match(await callTool('memory_note', { kind: 'fact', text: 'GLOBEX is the client of record.' }, { ...context, messageId: 'r2' }), /^Already remembered/);
    assert.equal(memory.memoryCount(), 1);
  } finally {
    memory.close();
  }
  // A guard handed in directly is the one used; without a config there is still the shape guard.
  const own = await openMemory({ dbFile: join(root, 'memory2.sqlite'), env: { PULSE_EMBED: '0' }, stateRoot: join(root, 'no-such-home'), privacy: new Privacy({ terms: ['Initech'] }) });
  try {
    await callTool('memory_note', { kind: 'decision', text: 'Initech keys live in AIzaSyA1234567890abcdefghijklmnop.' }, { memory: own, projectRoot: root, agent: 'codex', mode: '1', messageId: 'r3' });
    assert.equal(own.memories()[0].text, `${PRIVACY_MARKER} keys live in [key].`);
  } finally {
    own.close();
  }
  const bare = await openMemory({ dbFile: join(root, 'memory3.sqlite'), env: { PULSE_EMBED: '0' }, stateRoot: join(root, 'no-such-home') });
  try {
    await callTool('memory_note', { kind: 'fact', text: 'The token is ghp_abcdefghijklmnopqrstuvwxyz0123.' }, { memory: bare, projectRoot: root, agent: 'codex', mode: '1', messageId: 'r4' });
    assert.equal(bare.memories()[0].text, 'The token is [token].');
  } finally {
    bare.close();
  }
});

test('enlaces · S-013: purging the privacy rewrites the memories table, which is what a link reads', async () => {
  const root = await scratch('madre-enlaces-s013-');
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const privacy = new Privacy();   // nothing guarded yet: the notes land with the term
    const memory = await new RoomMemory(join(root, 'memory.sqlite')).attachPrivacy(privacy).initialize(store);
    const room = new Room({ store, agents: roster, projectRoot: root, invokers: { 'codex-readonly': async () => ({ text: 'ok', usage: null }) }, memory, privacy, distill: { enabled: false } });
    await room.send({ text: 'Who is the client?', target: 'codex' });
    memory.addMemories([
      { kind: 'fact', text: 'Globex is the client of record.', sources: [1] },
      { kind: 'decision', text: 'Globex ships on Fridays.', sources: [1] },
      { kind: 'preference', text: 'Reply briefly.', sources: [1] },
    ], { agent: 'codex', fromSequence: 1, throughSequence: 1 });
    room.setPrivacy(['Globex']);
    assert.equal(room.privacyExposure([]).memories, 2);
    const purged = await room.purgePrivate();
    assert.equal(purged.memories, 2);
    const notes = memory.memories();
    assert.equal(notes.length, 3);
    assert.ok(!JSON.stringify(notes).includes('Globex'), 'a note still carries the term after the purge');
    assert.deepEqual(notes.map((note) => note.text).sort(), [`${PRIVACY_MARKER} is the client of record.`, `${PRIVACY_MARKER} ships on Fridays.`, 'Reply briefly.'].sort());
    assert.equal(memory.exposure().memories, 0);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('enlaces · the room that serves holds every lock, and hands over only what travels, of the kinds signed, through its own guard', async () => {
  const state = await scratch('madre-enlaces-state-');
  const projectA = await realpath(await scratch('madre-enlaces-a-'));
  const projectB = await realpath(await scratch('madre-enlaces-b-'));
  const invokers = { 'codex-readonly': async () => ({ text: 'done' }) };
  const a = await createPulseServer({ projectRoot: projectA, stateRoot: state, agents: roster, invokers });
  const b = await createPulseServer({ projectRoot: projectB, stateRoot: state, agents: roster, invokers });
  const portA = await listen(a.server);
  await a.markOpen(portA);
  const portB = await listen(b.server);
  await b.markOpen(portB);
  const [idA, idB] = [projectRoomId(projectA), projectRoomId(projectB)];
  const stranger = 'stranger-0123456789abcdef';
  const key = await channelKey(state);
  const route = (port) => `http://127.0.0.1:${port}/api/enlace/memories`;
  const ask = (params, headers = {}, port = portA) => fetch(`${route(port)}?${new URLSearchParams(params)}`, { headers: { [CHANNEL_HEADER]: key, ...headers } });
  const json = (method, port, path, payload) => fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  try {
    // A's archive, written into its own memory file: what travels and what does not.
    const memory = await new RoomMemory(join(state, 'rooms', idA, 'memory.sqlite')).initialize();
    memory.addMemories([
      { kind: 'decision', text: 'Webhook signatures are verified before parsing.', sources: [1] },
      { kind: 'fact', text: 'The client of record is Globex.', sources: [1] },
      { kind: 'question', text: 'Should the webhook retry on 5xx?', sources: [1] },
      { kind: 'fact', text: 'The webhook answers on /hooks/stripe.', sources: [1] },
      { kind: 'aberration', text: 'Globex pays in euros.', sources: [1] },
    ], { agent: 'codex', fromSequence: 1, throughSequence: 1 });
    const wrong = memory.memories().find((note) => note.text.startsWith('The webhook answers'));
    assert.ok(memory.flagAberration({ text: 'The webhook answers on /hooks/stripe, so the room said.', correction: 'It answers on /webhooks/stripe.', contradicts: wrong.id }));
    assert.deepEqual(memory.memories().map((note) => [note.kind, note.zone]), [['aberration', 'medbay'], ['aberration', 'medbay'], ['fact', 'jettisoned'], ['question', 'hold'], ['fact', 'hold'], ['decision', 'hold']]);
    memory.close();

    // No contract: one answer, and the body says which 404 this is.
    const none = await ask({ contract: 'ffffffffffff-ffffff', asking: idB });
    assert.equal(none.status, 404);
    assert.deepEqual(await none.json(), { error: NO_SUCH_LINK });
    // The phone never reaches it, in the room and in the bridge's own policy.
    assert.equal(phonePolicy({ method: 'GET', pathname: '/api/enlace/memories' }).allow, false);

    // Signed: A serves B, decisions and facts, three readings an hour.
    const contract = await signContract(state, { rooms: { a: idA, b: idB }, direction: 'a→b', kinds: ['decision', 'fact'], orders: { perHour: 3 } });
    const params = { contract: contract.id, asking: idB };
    assert.equal((await ask(params, { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone' })).status, 403, 'reached from a phone');
    assert.equal((await ask(params, { origin: `http://127.0.0.1:${portA}` })).status, 403, 'reached from a page, even its own');
    assert.equal((await fetch(`${route(portA)}?${new URLSearchParams(params)}`)).status, 403, 'reached without the key');
    assert.equal((await ask(params, { [CHANNEL_HEADER]: key.replace(/^./, (first) => (first === 'a' ? 'b' : 'a')) })).status, 403, 'reached with another key');
    assert.equal((await ask({ contract: contract.id, asking: idA }, {}, portB)).status, 404, 'B served A against the arrow');
    assert.equal((await ask({ contract: contract.id, asking: stranger })).status, 404, 'served a room outside the contract');
    assert.equal((await ask({ contract: contract.id, asking: idA })).status, 404, 'served a room to itself');

    // Reading 1: the latest, of the kinds signed, that travel. Never the question, never the
    // refuted fact, never the aberrations; nothing of the ledger.
    const first = await ask(params);
    assert.equal(first.status, 200);
    const got = await first.json();
    assert.deepEqual(Object.keys(got), ['contract', 'from', 'notes']);
    assert.equal(got.from, idA);
    assert.deepEqual(got.notes.map((note) => [note.kind, note.zone, note.text]), [['fact', 'hold', 'The client of record is Globex.'], ['decision', 'hold', 'Webhook signatures are verified before parsing.']]);
    assert.deepEqual(Object.keys(got.notes[0]), ['id', 'kind', 'zone', 'text', 'fromSequence', 'throughSequence', 'created']);
    assert.ok(!JSON.stringify(got).includes('sources') && !JSON.stringify(got).includes('messageId'));

    // Reading 2: the human names a term in config.json; A's guard reads it before answering.
    await updateConfig(state, { privacy: { terms: ['Globex'] } });
    const second = await (await ask(params)).json();
    assert.deepEqual(second.notes.map((note) => note.text), [`The client of record is ${PRIVACY_MARKER}.`, 'Webhook signatures are verified before parsing.']);

    // Reading 3: with words, the same search of notes memory_search makes, cut at `limit`.
    const third = await (await ask({ ...params, q: 'webhook signatures', limit: '1' })).json();
    assert.deepEqual(third.notes.map((note) => note.text), ['Webhook signatures are verified before parsing.']);

    // Reading 4: over the hour.
    const fourth = await ask(params);
    assert.equal(fourth.status, 429);
    assert.match((await fourth.json()).error, /read 3 times in the last hour/);

    // What A kept of it: counters, never words. Three readings; the refused one left nothing.
    const reads = (await a.store.readAll()).filter((event) => event.type === 'enlace.read');
    assert.equal(reads.length, 3);
    assert.deepEqual(reads[0].payload, { contract: contract.id, to: idB, count: 2, kinds: ['decision', 'fact'], query: null });
    assert.deepEqual(reads[2].payload, { contract: contract.id, to: idB, count: 1, kinds: ['decision', 'fact'], query: '14bd78727f480ff1' });
    assert.ok(!JSON.stringify(reads).includes('webhook') && !JSON.stringify(reads).includes('Globex'), 'the ledger carries the query, or a note');
    const crossings = (await readFile(join(state, 'rooms', idA, 'enlaces.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(crossings.map((line) => [line.kind, line.contract, line.other, line.count]), [['read', contract.id, idB, 2], ['read', contract.id, idB, 2], ['read', contract.id, idB, 1]]);
    assert.equal(await countRecent(join(state, 'rooms', idA), contract.id, 'read'), 3);

    // Revoked: gone at once. Then a fresh contract, both ways and no ceiling to speak of.
    await revokeContract(state, contract.id);
    assert.equal((await ask(params)).status, 404, 'a revoked link still served');
    const fresh = await signContract(state, { rooms: { a: idB, b: idA }, direction: 'both', kinds: ['decision'], orders: { perHour: 100 } });

    // The side that asks: no Origin, no device, the key in its header; what comes back is recorded
    // as a count in the asking room, beside its record.
    const recorded = [];
    const answer = await askEnlace({ port: portA, contract: fresh, asking: idB, q: 'webhook', key, record: async (type, payload) => { recorded.push([type, payload]); }, roomDir: join(state, 'rooms', idB), turn: 'turn-1', agent: 'codex' });
    assert.deepEqual(answer, { contract: fresh.id, from: idA, notes: answer.notes });
    assert.deepEqual(answer.notes.map((note) => note.text), ['Webhook signatures are verified before parsing.']);
    assert.deepEqual(recorded, [['enlace.received', { contract: fresh.id, from: idA, count: 1, turn: 'turn-1', agent: 'codex' }]]);
    assert.equal(await countRecent(join(state, 'rooms', idB), fresh.id, 'received'), 1);
    assert.deepEqual(await askEnlace({ port: portA, contract: contract.id, asking: idB, key }), { refused: NO_SUCH_LINK, status: 404 });
    assert.deepEqual(await askEnlace({ port: portA, contract: fresh, asking: idB, key: 'not-the-key' }), { refused: hostWords('That is not the key of this Mac.'), status: 403 });
    assert.deepEqual(await askEnlace({ port: 1, contract: fresh, asking: idB, key, timeoutMs: 500 }), { unreachable: true });
    const calls = [];
    const fake = async (url, init) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 }); };
    assert.deepEqual(await askEnlace({ port: 4317, contract: fresh, asking: idB, q: 'x y', limit: 99, key, fetchImpl: fake }), { outdated: true }, 'a room on an older MADRE is outdated, not linkless');
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].init.headers, { [CHANNEL_HEADER]: key });
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(new URL(calls[0].url).searchParams.get('limit'), '20', 'the asking side already holds to the ceiling');
    assert.ok(!calls[0].url.includes(key), 'the key travelled in the URL');

    // Expired: a link that lapses while the rooms are open is gone the moment it does. (The pair
    // is connected once, so the fresh one is revoked first.)
    await revokeContract(state, fresh.id);
    const brief = await signContract(state, { rooms: { a: idA, b: idB }, direction: 'both', kinds: ['fact'], expires: new Date(Date.now() + 250).toISOString() });
    assert.equal((await ask({ contract: brief.id, asking: idB })).status, 200);
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal((await ask({ contract: brief.id, asking: idB })).status, 404, 'an expired link still served');

    // Sealed by CODE000: the archive answers nobody, links included. (A link in force for it: the
    // brief one lapsed, so the pair is free again.)
    const standing = await signContract(state, { rooms: { a: idB, b: idA }, direction: 'both', kinds: ['decision'] });
    const zero = await json('POST', portA, '/api/mother/code000', { designation: basename(projectA), strikes: 9 });
    assert.equal(zero.status, 200);
    const sealed = await ask({ contract: standing.id, asking: idB });
    assert.equal(sealed.status, 423);
    assert.match((await sealed.json()).error, /CODE000\. THE ARCHIVE IS SEALED/);
    assert.deepEqual(await askEnlace({ port: portA, contract: standing, asking: idB, key }), { refused: (await (await ask({ contract: standing.id, asking: idB })).json()).error, status: 423 });
  } finally {
    await close(b.server);
    await close(a.server);
  }
});

test('enlaces · D-S15: the Coordinator may learn from a project only when you tick it, on a link it reads, and forgets it when you clear it', async () => {
  const state = await scratch('madre-enlaces-train-');
  const salas = salasRoomId(state);
  const [a, b] = ['phobos-0123456789abcdef', 'gumball-0123456789abcdef'];
  const now = new Date('2026-10-16T12:00:00Z');
  const reads = { rooms: { a, b: salas }, direction: 'a→b', kinds: ['decision', 'fact'] };
  assert.equal(normalizeContract({ ...reads, train: true }, { now, salas }).train, true);
  assert.throws(() => normalizeContract({ ...reads, train: 'yes' }, { now, salas }), /learning can only be on or off/);
  assert.throws(() => normalizeContract({ rooms: { a, b }, direction: 'both', kinds: ['fact'], train: true }, { now, salas }), /Only the Coordinator learns/);
  assert.throws(() => normalizeContract({ ...reads, train: true, expires: '2026-10-18T00:00:00Z', signed: { by: 'bishop', at: now.toISOString() } }, { now, salas }), /never signs what it learns from/);
  const rooms = [{ id: a, name: 'phobos' }, { id: salas, name: 'salas' }];
  const signed = await signContract(state, reads, { now, rooms, salas });
  assert.equal(signed.train, false);
  const on = await trainContract(state, signed.id, true, { now, salas });
  assert.equal(on.train, true);
  const off = await trainContract(state, signed.id, false, { now, salas });
  assert.equal(off.train, false);
  assert.equal(await trainContract(state, 'not-an-id', true, { now, salas }), null);
});
