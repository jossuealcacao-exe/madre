// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Links between rooms (docs/MACROVERSO.md, phase 3b): the contract two rooms sign, the key that
// proves a caller is a MADRE process on this Mac, the side that asks, and the counters of what
// crossed. A link reads; nothing here writes in another room.
//
// The contract lives in `~/.pulse/config.json` under `enlaces`, keyed by id, written with
// `updateConfig` so every room on this Mac reads the same one and two rooms signing at once keep
// both (S-001, S-007). What may cross is said once, in src/memory.mjs: `travels()` and
// `RECALLED_ZONES` are cited here, never copied (docs/ZONAS.md). The locks live in the room that
// serves (src/server.mjs, the ENLACES section), never in the room that asks.
//
// The key: one secret in `~/.pulse/credentials/enlaces.json`, the same shape the vault keeps for a
// module (`{ name: value }`, 0600 inside 0700), made by the first room that needs it, carried in a
// header and never in a URL, a body or a log. Of the key, the ledger may know its name and its
// length, never its value (docs/SDK.md, the vault). It proves «a MADRE process on this Mac», not
// which room: that limit is written down, not papered over.

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { appendFile, chmod, link, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withConfig } from './config.mjs';
import { RECALLED_ZONES, STANDING_KINDS } from './memory.mjs';
import { knownRooms } from './salas.mjs';

// The kinds a contract may name: knowledge that stands. An aberration is the one kind that is
// not knowledge and it never crosses, whatever a contract says.
export const LINK_KINDS = [...STANDING_KINDS];
// The zones a link may read from are the zones a turn may read from, and nothing else.
export const LINK_ZONES = [...RECALLED_ZONES];
export const DIRECTIONS = ['a→b', 'b→a', 'both'];
export const MAX_LIMIT = 20;
export const DEFAULT_PER_HOUR = 6;
export const MAX_ORDER_MODE = 2;
export const HOUR_MS = 60 * 60 * 1000;
// The header the asking room presents, and the one answer every refused contract gets: the side
// that asks is never told whether the link is missing, revoked, expired or facing the other way.
export const CHANNEL_HEADER = 'x-madre-enlace';
export const NO_SUCH_LINK = 'No such link.';
// `order` is one of BISHOP's orders that reached this room (fase 4b). It is counted apart from the
// readings, each kind against the contract's own `perHour`: asking BISHOP a question, which reads,
// never uses up the orders, and an order never uses up a reading.
// `corpus` is a whole reading for the Coordinator's training (D-S15), counted apart from the
// readings of a turn and against its own ceiling; `learned` is the same crossing seen from Salas.
// `state` is the project's canonical state read across a link (D-S16), counted against `perHour`
// apart from the readings of notes. `delivered` is a note another project handed to this one, kept
// pending until this project accepts it (D-S17); `sent` is the same crossing seen from the sender.
export const CROSSINGS = ['read', 'received', 'order', 'corpus', 'learned', 'state', 'delivered', 'sent'];
// D-S15: what one training export may take from one project, and how many such exports an hour.
export const CORPUS_MAX = 5000;
export const CORPUS_PER_HOUR = 6;
// D-S17: what one delivery may carry, how long each note may be, and how many may wait at once in
// the project that receives them before it accepts or declines some.
export const DELIVER_MAX = 5;
export const DELIVER_CHARS = 600;
export const INBOX_MAX = 50;
// The permissions a link carries besides reading, each ticked only by the human from Home: D-S14
// (recall), D-S15 (train), D-S16 (state) and D-S17 (deliver). BISHOP never signs any of them.
export const LINK_FLAGS = ['recall', 'train', 'state', 'deliver'];
// What one room may tell another about a link, by the channel: that it was signed or revoked.
// Each lands in the other room's ledger as a line, never as a message (phase 3c).
export const NOTICES = ['enlace.signed', 'enlace.revoked'];
export const DAY_MS = 24 * HOUR_MS;
// The longest link BISHOP may sign on its own (D-S13).
export const BISHOP_SIGN_DAYS = 7;
// The most notes a link with automatic recall brings to one turn, across every such link (3e).
export const RECALL_NOTES = 3;

const OWNER_ONLY = 0o600;
const OWNER_DIR = 0o700;
const KEY_HEX = /^[0-9a-f]{64}$/;
const ID = /^[0-9a-f]{12}-[0-9a-f]{6}$/;
// A room id is a folder name under ~/.pulse/rooms: never a path.
const ROOM = /^[^/\\\0]{1,200}$/;

const fail = (why, code = null) => { throw Object.assign(new Error(why), code ? { code } : {}); };
const pairHash = (a, b) => createHash('sha256').update([String(a), String(b)].sort().join('\n')).digest('hex').slice(0, 12);
const asDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };

// Stable for the pair of rooms, plus a short nonce so the same two rooms can sign again after a
// revocation and the old id never comes back to life.
export function contractId({ a, b }, { nonce = randomBytes(3).toString('hex') } = {}) {
  return `${pairHash(a, b)}-${nonce}`;
}

function isoOrNull(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'string' || value instanceof Date || typeof value === 'number' ? asDate(value) : null;
  if (!date) fail(`${field} is not a date.`);
  return date.toISOString();
}

// The rooms that hand their notes over under a contract: the arrow's tail, or both ends.
export const servingRooms = (contract) => (contract.direction === 'both' ? [contract.rooms.a, contract.rooms.b] : contract.direction === 'a→b' ? [contract.rooms.a] : [contract.rooms.b]);

// The room BISHOP's orders may reach under a contract: the end that is not the room of Salas.
// `null` when the contract allows no orders, or when neither end is that room.
export function receivesOrders(contract, salas) {
  if (!contract?.orders?.allowed || !salas) return null;
  const { a, b } = contract.rooms;
  return a === salas ? b : b === salas ? a : null;
}

// The contract, whole and checked, or the reason it is not one. The shape is §4B of the encargo:
// two rooms, a direction, the kinds that may cross, the zones (fixed: what travels into a turn),
// an expiry, a revocation, the ceiling for BISHOP's orders, and the human's signature.
//
// With `salas` (the id of the room of Salas, src/salas.mjs) two more rules hold: that room never
// serves — BISHOP gathers every room and is nobody's source (§4C.7) — and orders are allowed only
// on a link with that room at one end, which is then the end that gives them.
export function normalizeContract(raw, { now = new Date(), salas = null } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('A link is an object.');
  const rooms = raw.rooms && typeof raw.rooms === 'object' ? raw.rooms : {};
  const a = typeof rooms.a === 'string' ? rooms.a.trim() : '';
  const b = typeof rooms.b === 'string' ? rooms.b.trim() : '';
  if (!ROOM.test(a) || !ROOM.test(b)) fail('A link names two rooms, a and b.');
  if (a === b) fail('A project cannot be connected to itself.');

  const id = raw.id === undefined || raw.id === null ? contractId({ a, b }) : String(raw.id);
  if (!ID.test(id)) fail('That is not a link id.');
  if (id.slice(0, 12) !== pairHash(a, b)) fail('The link id does not belong to these rooms.');

  const direction = String(raw.direction ?? '').replace('->', '→');
  if (!DIRECTIONS.includes(direction)) fail('The direction is a→b, b→a or both.');

  if (!Array.isArray(raw.kinds) || !raw.kinds.length) fail('A connection names the kinds that may cross.');
  const kinds = [...new Set(raw.kinds.map(String))];
  for (const kind of kinds) {
    if (kind === 'aberration') fail('A doubtful memory never crosses a connection.');
    if (!LINK_KINDS.includes(kind)) fail(`"${kind}" is not a kind of memory.`);
  }
  kinds.sort((x, y) => LINK_KINDS.indexOf(x) - LINK_KINDS.indexOf(y));

  // Not configurable: a contract that names any other set of zones is refused rather than
  // trimmed, so nobody believes they signed something the room will not do.
  if (raw.zones !== undefined && raw.zones !== null) {
    const asked = Array.isArray(raw.zones) ? [...new Set(raw.zones.map(String))].sort() : null;
    if (!asked || asked.length !== LINK_ZONES.length || asked.some((zone) => !LINK_ZONES.includes(zone))) fail('The zones of a link are not configurable: only what travels into a turn crosses.');
  }

  const expires = isoOrNull(raw.expires, 'expires');
  const revoked = isoOrNull(raw.revoked, 'revoked');
  // Fase 3e: the room that reads also gets, on each turn, up to RECALL_NOTES of these notes without
  // asking. Off unless the human ticks it; a reading like any other, counted against `perHour`.
  if (raw.recall !== undefined && raw.recall !== null && typeof raw.recall !== 'boolean') fail('automatic recall can only be on or off.');
  const recall = raw.recall === true;
  // D-S15: the Coordinator may learn from this project — its notes enter the Coordinator's training
  // export (src/dataset.mjs) and, once trained, its local model. Off unless the human ticks it, and
  // only on a link the Coordinator reads; checked against the Coordinator below.
  if (raw.train !== undefined && raw.train !== null && typeof raw.train !== 'boolean') fail('learning can only be on or off.');
  const train = raw.train === true;
  // D-S16: the room that reads may also read the project's canonical state (Continuity, AHP+).
  if (raw.state !== undefined && raw.state !== null && typeof raw.state !== 'boolean') fail('sharing the project state can only be on or off.');
  const state = raw.state === true;
  // D-S17: the room that reads may hand notes back to the room that serves, where they wait until
  // that project accepts them. A delivery never writes in the other project's memory by itself.
  if (raw.deliver !== undefined && raw.deliver !== null && typeof raw.deliver !== 'boolean') fail('delivering notes can only be on or off.');
  const deliver = raw.deliver === true;

  const orders = raw.orders && typeof raw.orders === 'object' ? raw.orders : {};
  const maxMode = orders.maxMode === undefined ? 1 : Number(orders.maxMode);
  if (!Number.isInteger(maxMode) || maxMode < 0) fail('orders.maxMode is a mode, #0 to #2.');
  if (maxMode > MAX_ORDER_MODE) fail(`orders.maxMode never passes #${MAX_ORDER_MODE}: #3 and #4 are armed by the human, in that room.`);
  const perHour = orders.perHour === undefined ? DEFAULT_PER_HOUR : Number(orders.perHour);
  if (!Number.isInteger(perHour) || perHour < 1 || perHour > 1000) fail('orders.perHour is a whole number above zero.');
  const allowed = Boolean(orders.allowed);
  if (salas) {
    const serves = direction === 'both' ? [a, b] : direction === 'a→b' ? [a] : [b];
    if (serves.includes(salas)) fail('The Coordinator never shares through a connection: it gathers every project and is nobody\'s source.');
    if (allowed && a !== salas && b !== salas) fail('Orders need the Coordinator at one end of the connection.');
    if (train && a !== salas && b !== salas) fail('Only the Coordinator learns from a connection.');
  }

  // Who signed it (D-S13): the human always may; BISHOP only a link to read, with no orders, that
  // expires within BISHOP_SIGN_DAYS of its signature. A stored contract that breaks this is not a
  // contract: `activeContracts` skips it.
  const signed = raw.signed && typeof raw.signed === 'object' ? raw.signed : {};
  const by = signed.by === undefined || signed.by === null ? 'you' : signed.by;
  if (by !== 'you' && by !== 'bishop') fail('Only you or the Coordinator sign a connection.');
  const at = signed.at === undefined || signed.at === null ? new Date(now).toISOString() : isoOrNull(signed.at, 'signed.at');
  if (by === 'bishop') {
    if (allowed) fail('The Coordinator signs only connections to read; a connection with orders is signed by you.');
    if (train) fail('The Coordinator never signs what it learns from: you do.');
    if (state) fail('The Coordinator never signs a connection that shares the project state: you do.');
    if (deliver) fail('The Coordinator never signs a connection that delivers notes: you do.');
    if (expires === null || Date.parse(expires) - Date.parse(at) > BISHOP_SIGN_DAYS * DAY_MS + 60000) fail('The Coordinator signs only connections that expire within 7 days.'); // BISHOP_SIGN_DAYS, said literally for the catalogue
  }

  return {
    id,
    rooms: { a, b },
    direction,
    kinds,
    zones: [...LINK_ZONES],
    expires,
    revoked,
    orders: { allowed, maxMode, perHour },
    signed: { at, by },
    recall,
    train,
    state,
    deliver,
  };
}

// Revoked or expired is the same as never signed.
export const inForce = (contract, now = new Date()) => Boolean(contract) && contract.revoked === null && (contract.expires === null || Date.parse(contract.expires) > new Date(now).getTime());

// Every contract in force, read from the config every room shares. A malformed entry is skipped,
// never repaired: a link the room cannot read is a link that does not exist.
export function activeContracts(config, { now = new Date(), salas = null } = {}) {
  const raw = config?.enlaces;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const out = [];
  for (const [id, entry] of Object.entries(raw)) {
    let contract;
    try { contract = normalizeContract({ ...entry, id: entry?.id ?? id }, { now, salas }); } catch { continue; }
    if (contract.id === id && inForce(contract, now)) out.push(contract);
  }
  return out;
}

// The contracts that let `asking` read, each with the room it reads from. What a module, a tool
// and the asking side of the channel all need to know, said once.
export function readsFrom(contracts, asking, { now = new Date() } = {}) {
  const out = [];
  for (const contract of contracts) {
    for (const from of [contract.rooms.a, contract.rooms.b]) {
      if (from !== asking && mayServe({ contract, serving: from, asking, now }).ok) out.push({ contract, from });
    }
  }
  return out;
}

// May `serving` hand its notes to `asking` under this contract, now? The arrow says which way
// notes travel: `a→b` lets b read from a, so a serves and b asks.
export function mayServe({ contract, serving, asking, now = new Date() }) {
  if (!contract) return { ok: false, why: 'no-contract' };
  if (contract.revoked !== null) return { ok: false, why: 'revoked' };
  if (contract.expires !== null && Date.parse(contract.expires) <= new Date(now).getTime()) return { ok: false, why: 'expired' };
  const { a, b } = contract.rooms;
  const from = serving === a ? 'a' : serving === b ? 'b' : null;
  const to = asking === a ? 'a' : asking === b ? 'b' : null;
  if (!from || !to || from === to) return { ok: false, why: 'not-a-party' };
  if (contract.direction !== 'both' && contract.direction !== `${from}→${to}`) return { ok: false, why: 'direction' };
  return { ok: true };
}

// Signing writes one key under `enlaces`: `updateConfig` merges that level by key, so two rooms
// signing at once keep both contracts, as two modules saving at once keep both (S-007). Both
// rooms must be known on this Mac — asleep is fine; it is read when it wakes. `rooms` may be the
// ids, or the rooms as `knownRooms` lists them (with their names).
//
// A link that lets orders through is signed the way #3 is armed: the human types the designation
// of the room that will receive them — its name, whichever letters — or nothing is signed
// (§4B). The error carries `code: 'DESIGNATION'` so the route can answer 403 and not 422.
export async function signContract(stateRoot, raw, { now = new Date(), rooms = null, salas = null, designation = null } = {}) {
  const contract = normalizeContract(raw, { now, salas });
  if (contract.revoked !== null) fail('A link is not signed already revoked.');
  if (contract.expires !== null && Date.parse(contract.expires) <= new Date(now).getTime()) fail('That connection would already have expired.');
  const known = new Map((rooms ?? await knownRooms(stateRoot)).map((room) => (typeof room === 'string' ? [room, { id: room, name: room }] : [room.id, room])));
  for (const id of [contract.rooms.a, contract.rooms.b]) if (!known.has(id)) fail(`MADRE does not know the room ${id} on this Mac.`, 'UNKNOWN_ROOM');
  const ordered = receivesOrders(contract, salas);
  if (ordered) {
    const name = String(known.get(ordered).name ?? ordered);
    if (typeof designation !== 'string' || designation.trim().toLowerCase() !== name.toLowerCase()) fail('UNABLE TO COMPUTE. UNABLE TO CLARIFY.', 'DESIGNATION');
  }
  // Two projects are connected once (2026-10-11): while one connection between them is in force,
  // whichever way it goes, no other is signed. Checked and written in one step (2026-10-12): checked
  // before the lock, two signatures at once both passed and both stood.
  const pair = [contract.rooms.a, contract.rooms.b].sort().join('\n');
  await withConfig(stateRoot, (config) => {
    if (activeContracts(config, { now, salas }).some((one) => [one.rooms.a, one.rooms.b].sort().join('\n') === pair)) fail('These two are already connected. To change it, revoke it in Connections and make a new one.', 'ALREADY');
    config.enlaces = config.enlaces && typeof config.enlaces === 'object' && !Array.isArray(config.enlaces) ? config.enlaces : {};
    config.enlaces[contract.id] = contract;
    return config;
  });
  return contract;
}

// Revoking stamps the moment and keeps the contract: a link that was revoked is a fact of the
// record, and the id never comes back (a new signature gets a new nonce).
// Only an id that is one: `__proto__` and its kind wrote junk into the shared file (INI-06).
export async function revokeContract(stateRoot, id, { now = new Date() } = {}) {
  if (typeof id !== 'string' || !ID.test(id)) return null;
  let revoked = null;
  await withConfig(stateRoot, (config) => {
    const current = config.enlaces && Object.hasOwn(config.enlaces, id) ? config.enlaces[id] : null;
    if (!current || typeof current !== 'object') return null;
    revoked = { ...current, id, revoked: current.revoked ?? new Date(now).toISOString() };
    config.enlaces[id] = revoked;
    return config;
  });
  return revoked;
}

// «Include always» on a link, ticked or cleared: only that field, and only on a link still in
// force, read and written in one step — written from a copy read before, it crossed a revocation
// and put the revoked link back in force (INI-02).
export async function recallContract(stateRoot, id, recall, { now = new Date(), salas = null } = {}) {
  if (typeof id !== 'string' || !ID.test(id)) return null;
  let changed = null;
  await withConfig(stateRoot, (config) => {
    if (!activeContracts(config, { now, salas }).some((one) => one.id === id)) return null;
    config.enlaces[id] = { ...config.enlaces[id], recall: recall === true };
    changed = activeContracts(config, { now, salas }).find((one) => one.id === id) ?? null;
    return config;
  });
  return changed;
}

// «The Coordinator may learn from this project» (D-S15), ticked or cleared by the human: the same
// one-step read and write as recall, on a link still in force. Cleared, nothing more of that
// project enters the Coordinator's next export, and Salas forgets the copy it kept for it.
export async function trainContract(stateRoot, id, train, { now = new Date(), salas = null } = {}) {
  if (typeof id !== 'string' || !ID.test(id)) return null;
  let changed = null;
  await withConfig(stateRoot, (config) => {
    if (!activeContracts(config, { now, salas }).some((one) => one.id === id)) return null;
    const next = { ...config.enlaces[id], train: train === true };
    normalizeContract({ ...next, id }, { now, salas });
    config.enlaces[id] = next;
    changed = activeContracts(config, { now, salas }).find((one) => one.id === id) ?? null;
    return config;
  });
  return changed;
}

// D-S16 and D-S17: «it shares its state» or «notes can be delivered to it», ticked or cleared by
// the human from Home. The same one-step read and write as recall and train, on a link in force.
export async function allowContract(stateRoot, id, field, on, { now = new Date(), salas = null } = {}) {
  if (!['state', 'deliver'].includes(field)) fail('That is not something a connection can allow.');
  if (typeof id !== 'string' || !ID.test(id)) return null;
  let changed = null;
  await withConfig(stateRoot, (config) => {
    if (!activeContracts(config, { now, salas }).some((one) => one.id === id)) return null;
    const next = { ...config.enlaces[id], [field]: on === true };
    normalizeContract({ ...next, id }, { now, salas });
    config.enlaces[id] = next;
    changed = activeContracts(config, { now, salas }).find((one) => one.id === id) ?? null;
    return config;
  });
  return changed;
}

// The rooms `sender` may deliver notes to (D-S17): the rooms it reads from under a link that says
// `deliver`. A delivery goes against the arrow — to the project whose notes this one reads.
export function deliversTo(contracts, sender, { now = new Date() } = {}) {
  return readsFrom(contracts, sender, { now }).filter(({ contract }) => contract.deliver).map(({ contract, from }) => ({ contract, to: from }));
}

/* ---------- the key of the channel ---------- */

export const channelKeyFile = (stateRoot) => join(stateRoot, 'credentials', 'enlaces.json');

async function readKey(file) {
  const parsed = JSON.parse(await readFile(file, 'utf8'));
  const key = parsed && typeof parsed === 'object' ? parsed.key : null;
  if (typeof key !== 'string' || !KEY_HEX.test(key)) fail('credentials/enlaces.json does not hold a key.');
  return key;
}

// The key is made the first time a room needs it: a whole file written beside the name and
// linked under it, which lands only if nothing is there yet — two rooms making it at once keep
// the one that landed first, and nobody ever reads half a key. Read from disk on every call, so
// every room on this Mac holds the same one.
export async function channelKey(stateRoot) {
  const file = channelKeyFile(stateRoot);
  try {
    return await readKey(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const dir = join(stateRoot, 'credentials');
  await mkdir(dir, { recursive: true, mode: OWNER_DIR });
  // An older credentials directory may predate this mode (src/vault.mjs does the same).
  await chmod(dir, OWNER_DIR).catch(() => {});
  const draft = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const content = `${JSON.stringify({ key: randomBytes(32).toString('hex') })}\n`;
  await writeFile(draft, content, { mode: OWNER_ONLY });
  try {
    await link(draft, file);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      // A filesystem without hard links: the bridge's way (src/bridge/devices.mjs), one write
      // that lands only if nothing is there yet.
      try { await writeFile(file, content, { mode: OWNER_ONLY, flag: 'wx' }); } catch (again) { if (again.code !== 'EEXIST') throw again; }
    }
  } finally {
    await rm(draft, { force: true });
  }
  await chmod(file, OWNER_ONLY).catch(() => {});
  return readKey(file);
}

// Constant time, and never a throw on a header that is not a string.
export function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// What the ledger, a card or a report may know of the key: that it is there, its name, its
// length. Never the value.
export async function channelKeySummary(stateRoot) {
  try {
    const key = await readKey(channelKeyFile(stateRoot));
    return { name: 'enlaces.json', bytes: key.length };
  } catch {
    return null;
  }
}

/* ---------- the side that asks ---------- */

// Asks another room for notes under a contract. The call goes from this process to that one, on
// this Mac: no `Origin` (a page did not make it), no `x-madre-device` (a phone did not), the key
// in its header. What comes back is one of four things: the notes; `outdated` (that room runs a
// MADRE without the route); `refused` with the reason the serving room gave (no such link, no
// key, sealed, over its hourly limit); or `unreachable`. A received batch is recorded through
// `record` when the caller hands one in, and counted beside the room's record when it hands in
// the room's folder.
export async function askEnlace({ port, contract, asking, q = '', kinds = null, limit = MAX_LIMIT, key, fetchImpl = globalThis.fetch, timeoutMs = 4000, record = null, roomDir = null, turn = null, agent = null, auto = false, now = new Date() }) {
  const id = typeof contract === 'string' ? contract : contract?.id;
  if (!id || !asking) return { refused: NO_SUCH_LINK, status: 404 };
  const params = new URLSearchParams({ contract: id, asking, limit: String(Math.min(MAX_LIMIT, Math.max(1, Math.trunc(Number(limit)) || MAX_LIMIT))) });
  if (q) params.set('q', String(q));
  // Fewer kinds than the contract names, never more: the serving room intersects again.
  if (Array.isArray(kinds) && kinds.length) params.set('kinds', kinds.map(String).join(','));
  // Which agent of the asking room reads (S-021): the serving room keeps it as that room's word.
  if (agent) params.set('agent', String(agent));
  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}/api/enlace/memories?${params}`, {
      method: 'GET',
      headers: { [CHANNEL_HEADER]: typeof key === 'string' ? key : '' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { unreachable: true };
  }
  const answer = await response.json().catch(() => ({}));
  if (response.status === 404) return answer?.error === NO_SUCH_LINK ? { refused: NO_SUCH_LINK, status: 404 } : { outdated: true };
  if (!response.ok) return { refused: typeof answer?.error === 'string' ? answer.error : `HTTP ${response.status}`, status: response.status };
  const notes = Array.isArray(answer?.notes) ? answer.notes : [];
  const from = typeof answer?.from === 'string' ? answer.from : null;
  if (record) await record('enlace.received', { contract: id, from, count: notes.length, turn, agent, ...(auto ? { auto: true } : {}) });
  if (roomDir) await noteCrossing(roomDir, { kind: 'received', contract: id, other: from, count: notes.length, agent, turn, now });
  return { contract: id, from, notes };
}

// D-S15: the whole of what a project lets the Coordinator learn — every note that travels, of the
// kinds signed, cleaned by that project's privacy guard — asked by Salas when it exports its
// training data. The same doors as a reading (no Origin, no device, the key), its own route and its
// own ceiling. Returns `{ contract, from, name, notes }`, or `refused`, `outdated`, `unreachable`.
export async function askCorpus({ port, contract, asking, key, fetchImpl = globalThis.fetch, timeoutMs = 15000, record = null, roomDir = null, now = new Date() }) {
  const id = typeof contract === 'string' ? contract : contract?.id;
  if (!id || !asking) return { refused: NO_SUCH_LINK, status: 404 };
  const params = new URLSearchParams({ contract: id, asking });
  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}/api/enlace/corpus?${params}`, {
      method: 'GET',
      headers: { [CHANNEL_HEADER]: typeof key === 'string' ? key : '' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { unreachable: true };
  }
  const answer = await response.json().catch(() => ({}));
  if (response.status === 404) return answer?.error === NO_SUCH_LINK ? { refused: NO_SUCH_LINK, status: 404 } : { outdated: true };
  if (!response.ok) return { refused: typeof answer?.error === 'string' ? answer.error : `HTTP ${response.status}`, status: response.status };
  const notes = Array.isArray(answer?.notes) ? answer.notes.slice(0, CORPUS_MAX) : [];
  const from = typeof answer?.from === 'string' ? answer.from : null;
  const name = typeof answer?.name === 'string' ? answer.name : from;
  if (record) await record('enlace.learned', { contract: id, from, count: notes.length });
  if (roomDir) await noteCrossing(roomDir, { kind: 'learned', contract: id, other: from, count: notes.length, now });
  return { contract: id, from, name, notes };
}

// D-S16: the project's canonical state, asked by the room that reads under a link that says
// `state`. The same doors as a reading. Returns `{ contract, from, name, state }` — `state` is null
// when that project keeps no Continuity state — or `refused`, `outdated`, `unreachable`.
export async function askState({ port, contract, asking, key, fetchImpl = globalThis.fetch, timeoutMs = 6000, agent = null }) {
  const id = typeof contract === 'string' ? contract : contract?.id;
  if (!id || !asking) return { refused: NO_SUCH_LINK, status: 404 };
  const params = new URLSearchParams({ contract: id, asking });
  if (agent) params.set('agent', String(agent));
  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}/api/enlace/state?${params}`, { method: 'GET', headers: { [CHANNEL_HEADER]: typeof key === 'string' ? key : '' }, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return { unreachable: true };
  }
  const answer = await response.json().catch(() => ({}));
  if (response.status === 404) return answer?.error === NO_SUCH_LINK ? { refused: NO_SUCH_LINK, status: 404 } : { outdated: true };
  if (!response.ok) return { refused: typeof answer?.error === 'string' ? answer.error : `HTTP ${response.status}`, status: response.status };
  return { contract: id, from: typeof answer?.from === 'string' ? answer.from : null, name: typeof answer?.name === 'string' ? answer.name : null, state: answer?.state && typeof answer.state === 'object' ? answer.state : null };
}

// D-S17: notes handed to the project this room reads from, under a link that says `deliver`. They
// land there as pending; nothing enters that project's memory until it accepts them. Returns
// `{ accepted: n, ids }`, or `refused`, `outdated`, `unreachable`.
export async function deliverNotes({ port, contract, from, notes, key, agent = null, fetchImpl = globalThis.fetch, timeoutMs = 5000 }) {
  const id = typeof contract === 'string' ? contract : contract?.id;
  if (!id || !from) return { refused: NO_SUCH_LINK, status: 404 };
  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}/api/enlace/deliver`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CHANNEL_HEADER]: typeof key === 'string' ? key : '' },
      body: JSON.stringify({ contract: id, from, agent, notes }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { unreachable: true };
  }
  const answer = await response.json().catch(() => ({}));
  if (response.status === 404) return answer?.error === NO_SUCH_LINK ? { refused: NO_SUCH_LINK, status: 404 } : { outdated: true };
  if (!response.ok) return { refused: typeof answer?.error === 'string' ? answer.error : `HTTP ${response.status}`, status: response.status };
  return { accepted: Number(answer?.accepted) || 0, ids: Array.isArray(answer?.ids) ? answer.ids : [] };
}

// A note as a delivery may carry it: a kind that stands, a text of DELIVER_CHARS at most, and the
// reason in one line. Anything else is refused whole, so a sender never believes a note went.
export function deliverable(raw) {
  const kind = String(raw?.kind ?? '');
  if (!LINK_KINDS.includes(kind)) fail('A delivered note is a decision, a fact, a preference or a question.');
  const text = String(raw?.text ?? '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > DELIVER_CHARS) fail('A delivered note has between 1 and 600 characters.'); // DELIVER_CHARS, said literally for the catalogue
  const why = String(raw?.why ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
  return { kind, text, why };
}

/* ---------- the inbox of delivered notes (D-S17) ---------- */

// Beside the room's record, one file: every note another project delivered here, with what became
// of it. Pending until this project accepts or declines it; accepted, it enters the memory the way
// a distilled note does (held first, like any new note); declined, it is kept as a fact of the record.
export const inboxFile = (roomDir) => join(roomDir, 'enlaces-inbox.json');
const inboxLocks = new Map();
async function changeInbox(roomDir, change) {
  const file = inboxFile(roomDir);
  const before = inboxLocks.get(file) ?? Promise.resolve();
  let result;
  const run = before.then(async () => {
    let data = { notes: [] };
    try { const parsed = JSON.parse(await readFile(file, 'utf8')); if (Array.isArray(parsed?.notes)) data = parsed; } catch { /* a missing or torn inbox is empty */ }
    result = await change(data);
    await mkdir(roomDir, { recursive: true });
    const draft = `${file}.${process.pid}.tmp`;
    await writeFile(draft, `${JSON.stringify(data, null, 2)}\n`, { mode: OWNER_ONLY });
    await rename(draft, file);
  });
  inboxLocks.set(file, run.catch(() => null));
  await run;
  return result;
}
export async function readInbox(roomDir) {
  try { const parsed = JSON.parse(await readFile(inboxFile(roomDir), 'utf8')); return Array.isArray(parsed?.notes) ? parsed.notes : []; } catch { return []; }
}
export async function receiveDelivery(roomDir, { contract, from, name = null, agent = null, notes, now = new Date() }) {
  return changeInbox(roomDir, (data) => {
    const pending = data.notes.filter((note) => note.status === 'pending').length;
    if (pending + notes.length > INBOX_MAX) fail('This project has too many delivered notes waiting. Accept or decline some first.', 'FULL');
    const at = new Date(now).toISOString();
    const added = notes.map((note) => ({ id: `d-${randomBytes(4).toString('hex')}`, contract, from, name: name ?? from, agent, kind: note.kind, text: note.text, why: note.why ?? null, at, status: 'pending', decidedBy: null, decidedAt: null }));
    data.notes.push(...added);
    // The record keeps what was decided; only the last 500 lines stay in the file.
    if (data.notes.length > 500) data.notes = [...data.notes.filter((note) => note.status === 'pending'), ...data.notes.filter((note) => note.status !== 'pending').slice(-(500 - INBOX_MAX))];
    return added;
  });
}
export async function decideDelivery(roomDir, id, { accept, by = 'you', now = new Date() }) {
  return changeInbox(roomDir, (data) => {
    const note = data.notes.find((one) => one.id === id);
    if (!note || note.status !== 'pending') return null;
    Object.assign(note, { status: accept ? 'accepted' : 'declined', decidedBy: by, decidedAt: new Date(now).toISOString() });
    return { ...note };
  });
}

// Tells another room, by the channel, that a link of its was signed or revoked. The same call as
// `askEnlace` makes, the other way: no `Origin`, no device, the key in its header, a short wait.
// What comes back is `{ ok }`, `{ outdated }` (that room runs a MADRE without the route),
// `{ refused, status }` or `{ unreachable }`; the caller never lets any of them stop a signature.
export async function noticeEnlace({ port, type, payload, key, fetchImpl = globalThis.fetch, timeoutMs = 3000 }) {
  if (!NOTICES.includes(type)) fail(`A notice is one of ${NOTICES.join(', ')}.`);
  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}/api/enlace/notice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CHANNEL_HEADER]: typeof key === 'string' ? key : '' },
      body: JSON.stringify({ type, payload }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { unreachable: true };
  }
  if (response.status === 404) return { outdated: true };
  if (!response.ok) {
    const answer = await response.json().catch(() => ({}));
    return { refused: typeof answer?.error === 'string' ? answer.error : `HTTP ${response.status}`, status: response.status };
  }
  return { ok: true };
}

/* ---------- the counters ---------- */

// One line per crossing beside the room's record, so the traffic of a link is counted without
// opening every ledger on every refresh: `{ at, kind: 'read' | 'received', contract, other, count }`.
export const crossingsFile = (roomDir) => join(roomDir, 'enlaces.jsonl');

export async function noteCrossing(roomDir, { kind, contract, other = null, count = 0, agent = null, turn = null, now = new Date() }) {
  if (!CROSSINGS.includes(kind)) fail(`A crossing is one of ${CROSSINGS.join(', ')}.`);
  const id = typeof contract === 'string' ? contract : contract?.id;
  if (!id) fail('A crossing names its contract.');
  await mkdir(roomDir, { recursive: true });
  const line = { at: new Date(now).toISOString(), kind, contract: id, other, count: Number.isInteger(count) ? count : 0, ...(agent ? { agent: String(agent) } : {}), ...(turn ? { turn: String(turn) } : {}) };
  await appendFile(crossingsFile(roomDir), `${JSON.stringify(line)}\n`);
  return line;
}

// The lines of one contract and one kind beside a room's record, oldest first. A torn line is
// skipped, never fatal; no file is no crossing.
async function crossings(roomDir, contract, kind) {
  const id = typeof contract === 'string' ? contract : contract?.id;
  let raw = '';
  try { raw = await readFile(crossingsFile(roomDir), 'utf8'); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const out = [];
  for (const text of raw.split('\n')) {
    if (!text) continue;
    let line;
    try { line = JSON.parse(text); } catch { continue; }
    if (line?.contract === id && line.kind === kind && Number.isFinite(Date.parse(line.at))) out.push(line);
  }
  return out;
}

// How many crossings of that kind this contract had in the window: lines, not notes, because the
// ceiling is on readings.
export async function countRecent(roomDir, contract, kind, { sinceMs = HOUR_MS, now = new Date() } = {}) {
  const floor = new Date(now).getTime() - sinceMs;
  return (await crossings(roomDir, contract, kind)).filter((line) => Date.parse(line.at) >= floor).length;
}

// What Salas shows of a link's traffic: the readings the serving room (or rooms, on a link that
// goes both ways) handed over in the last day and the last hour, and when the latest was. Summed
// across the folders given, with `countRecent`; `lastAt` is the newest line or `null`.
export async function linkTraffic(roomDirs, contract, { now = new Date() } = {}) {
  const traffic = { reads24h: 0, reads1h: 0, lastAt: null, lastAgent: null, lastRoom: null };
  for (const roomDir of roomDirs) {
    traffic.reads24h += await countRecent(roomDir, contract, 'read', { sinceMs: DAY_MS, now });
    traffic.reads1h += await countRecent(roomDir, contract, 'read', { sinceMs: HOUR_MS, now });
    for (const line of await crossings(roomDir, contract, 'read')) {
      if (traffic.lastAt === null || Date.parse(line.at) > Date.parse(traffic.lastAt)) Object.assign(traffic, { lastAt: line.at, lastAgent: line.agent ?? null, lastRoom: line.other ?? null });
    }
  }
  return traffic;
}
