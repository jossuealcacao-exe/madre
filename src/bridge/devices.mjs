// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The phones that may reach this Mac, and the networks where they may.
//
// One file, `~/.pulse/devices.json`, owner-only, shared by every room on this Mac: any of them can
// make an invitation and whichever hosts the bridge redeems it. What is kept of a phone is a
// fingerprint of its token, never the token; what is kept of an invitation is a fingerprint of its
// code. Both fingerprints are HMACs under one key that lives in `~/.pulse/credentials/bridge.key`
// (docs/MOBILE.md, D-M01): MADRE's only key of its own, never in the config, a ledger or a log.
//
// Several rooms are separate processes, so every change takes a lock file, reads, changes and
// writes the whole file back by rename. A reader never sees half a file.

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OWNER_ONLY = 0o600;
export const INVITE_MS = 10 * 60 * 1000;
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
// A phone's last visit is written at most this often: every request would be a write.
const SEEN_EVERY_MS = 60 * 60 * 1000;

const storePath = (root) => join(root, 'devices.json');
const lockPath = (root) => join(root, 'devices.lock');
const keyPath = (root) => join(root, 'credentials', 'bridge.key');

const empty = () => ({ version: 1, enabled: true, devices: [], invites: [], networks: [] });

// The key is made the first time it is needed and never leaves this file.
export async function bridgeKey(root) {
  const file = keyPath(root);
  try {
    const hex = (await readFile(file, 'utf8')).trim();
    if (/^[0-9a-f]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(join(root, 'credentials'), { recursive: true, mode: 0o700 });
  const key = randomBytes(32);
  // `wx`: two rooms making it at once keep the one that landed first.
  try {
    await writeFile(file, `${key.toString('hex')}\n`, { mode: OWNER_ONLY, flag: 'wx' });
    return key;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return Buffer.from((await readFile(file, 'utf8')).trim(), 'hex');
  }
}

const fingerprint = (key, purpose, secret) => createHmac('sha256', key).update(`${purpose}:${secret}`).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const token = () => randomBytes(32).toString('base64url');

function normalise(raw) {
  const base = empty();
  if (!raw || typeof raw !== 'object') return base;
  return {
    version: 1,
    enabled: raw.enabled !== false,
    devices: Array.isArray(raw.devices) ? raw.devices.filter((one) => one && typeof one.id === 'string' && typeof one.hash === 'string') : [],
    invites: Array.isArray(raw.invites) ? raw.invites.filter((one) => one && typeof one.hash === 'string' && Number.isFinite(one.expiresAt)) : [],
    networks: Array.isArray(raw.networks) ? raw.networks.filter((one) => one && typeof one.id === 'string') : [],
  };
}

export async function readStore(root) {
  try {
    return normalise(JSON.parse(await readFile(storePath(root), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return empty();
    throw error;
  }
}

async function lock(root) {
  await mkdir(root, { recursive: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const handle = await open(lockPath(root), 'wx');
      await handle.close();
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // A lock left by a process that died mid-write is stale after a few seconds.
      const held = await stat(lockPath(root)).catch(() => null);
      if (held && Date.now() - held.mtimeMs > 5000) { await rm(lockPath(root), { force: true }); continue; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error('The list of phones is busy; try again.');
}

// Read, change, write, under the lock. `change` mutates the store and returns what the caller wants.
export async function withStore(root, change, { now = Date.now() } = {}) {
  await lock(root);
  try {
    const store = await readStore(root);
    // Lapsed invitations and phones are dropped on every write, so the file never grows.
    store.invites = store.invites.filter((one) => (one.redeemedAt ? now - one.redeemedAt < INVITE_MS : one.expiresAt > now));
    store.devices = store.devices.filter((one) => now - (one.seenAt ?? one.createdAt ?? 0) < SESSION_MS);
    const result = await change(store);
    const file = storePath(root);
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: OWNER_ONLY });
    await rename(temporary, file);
    return result;
  } finally {
    await rm(lockPath(root), { force: true });
  }
}

// An invitation: a code that goes only into the QR, good once, for ten minutes.
export async function createInvite(root, { now = Date.now(), ttlMs = INVITE_MS } = {}) {
  const key = await bridgeKey(root);
  const code = token();
  const hash = fingerprint(key, 'invite', code);
  const id = hash.slice(0, 12);
  await withStore(root, (store) => { store.invites.push({ id, hash, createdAt: now, expiresAt: now + ttlMs }); }, { now });
  return { id, code, expiresAt: now + ttlMs };
}

// What a phone says it is, from its user agent: only the kind, never the string itself.
export function deviceKind(userAgent = '') {
  if (/iPhone/i.test(userAgent)) return 'iphone';
  if (/iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent))) return 'ipad';
  if (/Android/i.test(userAgent)) return /Mobile/i.test(userAgent) ? 'android' : 'android-tablet';
  return 'other';
}

// The phone hands the code back; it becomes a phone with a token of its own. A code is spent the
// moment it is used, even by a request that fails afterwards.
export async function redeemInvite(root, code, { userAgent = '', now = Date.now() } = {}) {
  if (typeof code !== 'string' || code.length < 20 || code.length > 100) return null;
  const key = await bridgeKey(root);
  const hash = fingerprint(key, 'invite', code);
  return withStore(root, (store) => {
    const invite = store.invites.find((one) => same(one.hash, hash));
    if (!invite || invite.redeemedAt || invite.expiresAt <= now) return null;
    const secret = token();
    const device = { id: randomUUID(), kind: deviceKind(userAgent), createdAt: now, seenAt: now, hash: fingerprint(key, 'device', secret) };
    store.devices.push(device);
    invite.redeemedAt = now;
    invite.device = device.id;
    return { device: publicDevice(device), token: secret };
  }, { now });
}

export const publicDevice = ({ id, kind, createdAt, seenAt }) => ({ id, kind, createdAt, seenAt });

// The phone behind a token, or null. Its last visit is written at most once an hour.
export async function deviceForToken(root, secret, { now = Date.now(), store = null } = {}) {
  if (typeof secret !== 'string' || secret.length < 20 || secret.length > 100) return null;
  const key = await bridgeKey(root);
  const hash = fingerprint(key, 'device', secret);
  const current = store ?? await readStore(root);
  const device = current.devices.find((one) => same(one.hash, hash));
  if (!device || now - (device.seenAt ?? device.createdAt) >= SESSION_MS) return null;
  if (now - (device.seenAt ?? 0) >= SEEN_EVERY_MS) {
    await withStore(root, (fresh) => {
      const mine = fresh.devices.find((one) => one.id === device.id);
      if (mine) mine.seenAt = now;
    }, { now }).catch(() => null);
  }
  return publicDevice({ ...device, seenAt: Math.max(device.seenAt ?? 0, now) });
}

export async function forgetDevice(root, id) {
  return withStore(root, (store) => {
    const before = store.devices.length;
    store.devices = store.devices.filter((one) => one.id !== id);
    return store.devices.length < before;
  });
}

export async function setEnabled(root, on) {
  return withStore(root, (store) => { store.enabled = Boolean(on); return store.enabled; });
}

// A network is known by the fingerprint network.mjs makes of it; its name is the person's.
export async function trustNetwork(root, { id, name = null, now = Date.now() }) {
  if (typeof id !== 'string' || !id) throw new Error('No network to trust.');
  return withStore(root, (store) => {
    if (!store.networks.some((one) => one.id === id)) store.networks.push({ id, name: typeof name === 'string' ? name.slice(0, 60) : null, addedAt: now });
    return store.networks;
  }, { now });
}

export async function forgetNetwork(root, id) {
  return withStore(root, (store) => {
    store.networks = store.networks.filter((one) => one.id !== id);
    return store.networks;
  });
}

// What the Mac's own page may see: never a hash.
export function storeView(store, { now = Date.now() } = {}) {
  return {
    enabled: store.enabled,
    devices: store.devices.map(publicDevice),
    invites: store.invites.filter((one) => one.expiresAt > now || one.redeemedAt).map(({ id, expiresAt, redeemedAt = null, device = null }) => ({ id, expiresAt, redeemedAt, device })),
    networks: store.networks.map(({ id, name, addedAt }) => ({ id, name, addedAt })),
  };
}
