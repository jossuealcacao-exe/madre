// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE AUTHOR'S NOTICES (Q-11, 2026-11-06). What the author writes from the MADRE run from source
// («a version with a security fix is out», «if you use WSL, update») reaches every copy that is on,
// with or without the anonymous diagnostics, and without «Look for new versions».
//
// A notice is signed on the author's computer, with a key only the author holds (scripts/
// notices-key.mjs); madre.run keeps and serves it (functions/api/avisos.js of the landing) but cannot
// make one up or change a word of it: a notice whose signature the key in src/notices-key.mjs does
// not verify is never shown. The worst madre.run can do is not serve one.
//
// What a copy asks: GET madre.run/api/avisos, with nothing about the person, not even its version.
// It decides by itself which notices are for it (its version, its system), and remembers which ones
// it showed. At most every 15 minutes per computer, however many projects are open.
//
// Levels: «info» and «important» can be turned off (Settings › Version); «security» always shows.

import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NOTICES_PUBLIC_KEY } from './notices-key.mjs';
import { compareVersions } from './updates.mjs';

export const NOTICES_URL = 'https://madre.run/api/avisos';
export const noticesUrl = (env = process.env) => env.PULSE_NOTICES_URL || NOTICES_URL;
export const noticesOn = (env = process.env) => env.PULSE_NOTICES !== '0';
export const LEVELS = ['info', 'important', 'security'];
export const SYSTEMS = ['darwin', 'linux', 'win32', 'wsl'];
const ID = /^[a-z0-9][a-z0-9-]{2,39}$/;
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,4}$/;
const SIG = /^[A-Za-z0-9+/]{40,120}={0,2}$/;
export const TITLE_MAX = 80;
export const BODY_MAX = 400;
const LONGEST_MS = 90 * 86_400_000;
const FRESH_MS = 15 * 60_000;
const TIMEOUT_MS = 8000;
const MAX_FEED = 64 * 1024;

const folder = (stateRoot) => join(stateRoot, 'avisos');
const readJson = (file) => readFile(file, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
async function writeAtomic(file, data) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, data);
  await rename(temp, file);
}

// Only text, short, in both languages; a link only to madre.run. Anything else is not a notice.
const words = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim() : '');
function pair(value, max) {
  if (!value || typeof value !== 'object') return null;
  const es = words(value.es, max);
  const en = words(value.en, max);
  if (!es || !en || es.length > max || en.length > max) return null;
  return { es, en };
}
export function readNotice(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!ID.test(id) || !LEVELS.includes(raw.level)) return null;
  const title = pair(raw.title, TITLE_MAX);
  const body = pair(raw.body, BODY_MAX);
  if (!title || !body) return null;
  const from = Date.parse(raw.from);
  const until = Date.parse(raw.until);
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from || until - from > LONGEST_MS) return null;
  let link = null;
  if (raw.link !== undefined && raw.link !== null && raw.link !== '') {
    try {
      const url = new URL(String(raw.link));
      if (url.protocol !== 'https:' || url.hostname !== 'madre.run' || url.username || url.password) return null;
      link = url.href;
    } catch { return null; }
  }
  const to = raw.to && typeof raw.to === 'object' ? raw.to : {};
  const min = to.min ? String(to.min) : null;
  const max = to.max ? String(to.max) : null;
  if ((min && !VERSION.test(min)) || (max && !VERSION.test(max))) return null;
  const os = Array.isArray(to.os) ? to.os.filter((one) => SYSTEMS.includes(one)) : [];
  if (Array.isArray(to.os) && os.length !== to.os.length) return null;
  return { id, level: raw.level, title, body, link, to: { min, max, os }, from: new Date(from).toISOString(), until: new Date(until).toISOString() };
}

// The exact bytes signed: the notice read as above, its keys in this order, nothing else. A field
// added on the way (or one taken out) changes the bytes, and the signature no longer holds.
export const noticeBytes = (notice) => Buffer.from(JSON.stringify({
  id: notice.id, level: notice.level, title: { es: notice.title.es, en: notice.title.en }, body: { es: notice.body.es, en: notice.body.en },
  link: notice.link ?? null, to: { min: notice.to?.min ?? null, max: notice.to?.max ?? null, os: [...(notice.to?.os ?? [])] }, from: notice.from, until: notice.until,
}));
const retireBytes = (id) => Buffer.from(`madre-notice-retire:${id}`);

function checks(bytes, signature, publicKey) {
  if (!publicKey || typeof signature !== 'string' || !SIG.test(signature)) return false;
  try { return verify(null, bytes, createPublicKey(publicKey), Buffer.from(signature, 'base64')); } catch { return false; }
}
// One served entry, checked: `{ notice, sig }`, read and verified, or null.
export function verifiedNotice(entry, publicKey = NOTICES_PUBLIC_KEY) {
  const notice = readNotice(entry?.notice);
  if (!notice || !checks(noticeBytes(notice), entry.sig, publicKey)) return null;
  return notice;
}
export const verifiedRetire = (entry, publicKey = NOTICES_PUBLIC_KEY) => (ID.test(entry?.id ?? '') && checks(retireBytes(entry.id), entry.sig, publicKey) ? entry.id : null);

// On the author's computer only: the signatures madre.run will keep.
export function signNotice(raw, privateKeyPem) {
  const notice = readNotice(raw);
  if (!notice) throw new Error('That is not a notice MADRE would show: check the words, the dates and the link.');
  return { notice, sig: sign(null, noticeBytes(notice), createPrivateKey(privateKeyPem)).toString('base64') };
}
export const signRetire = (id, privateKeyPem) => {
  if (!ID.test(String(id))) throw new Error('No such notice.');
  return { id, sig: sign(null, retireBytes(id), createPrivateKey(privateKeyPem)).toString('base64') };
};

// Whether a notice is for this copy, now.
export function appliesTo(notice, { version, platform = process.platform, wsl = false, now = Date.now() }) {
  if (now < Date.parse(notice.from) || now >= Date.parse(notice.until)) return false;
  if (notice.to.min && compareVersions(version, notice.to.min) < 0) return false;
  if (notice.to.max && compareVersions(version, notice.to.max) > 0) return false;
  if (notice.to.os.length) {
    const here = wsl ? 'wsl' : platform;
    if (!notice.to.os.includes(here)) return false;
  }
  return true;
}

// The feed as madre.run serves it, checked one by one: the notices whose signatures hold, minus the
// ones the author retired with a signature of their own.
export function readFeed(data, publicKey = NOTICES_PUBLIC_KEY) {
  const retired = new Set((Array.isArray(data?.retired) ? data.retired : []).map((entry) => verifiedRetire(entry, publicKey)).filter(Boolean));
  const kept = [];
  for (const entry of Array.isArray(data?.notices) ? data.notices.slice(0, 50) : []) {
    const notice = verifiedNotice(entry, publicKey);
    if (notice && !retired.has(notice.id) && !kept.some((one) => one.notice.id === notice.id)) kept.push({ notice: entry.notice, sig: entry.sig });
  }
  return { entries: kept, retired: [...retired] };
}

// Asked of madre.run at most every 15 minutes per computer; what was verified is kept, so a copy
// offline still shows what it knew, until it expires.
export async function refreshNotices({ stateRoot, env = process.env, fetchImpl = globalThis.fetch, publicKey = NOTICES_PUBLIC_KEY, force = false, now = Date.now } = {}) {
  if (!noticesOn(env) || !publicKey) return { fresh: false, off: true };
  const dir = folder(stateRoot);
  const state = (await readJson(join(dir, 'state.json'))) ?? {};
  if (!force && state.checkedAt && now() - Date.parse(state.checkedAt) < FRESH_MS) return { fresh: false };
  await mkdir(dir, { recursive: true }).catch(() => {});
  // Said as checked before asking: another process of this computer that asks meanwhile waits its turn.
  await writeAtomic(join(dir, 'state.json'), JSON.stringify({ ...state, checkedAt: new Date(now()).toISOString() }, null, 2)).catch(() => {});
  try {
    const answer = await fetchImpl(noticesUrl(env), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!answer.ok) throw new Error(`HTTP ${answer.status}`);
    const text = await answer.text();
    if (text.length > MAX_FEED) throw new Error('too large');
    const feed = readFeed(JSON.parse(text), publicKey);
    await writeAtomic(join(dir, 'kept.json'), JSON.stringify(feed, null, 2));
    await writeAtomic(join(dir, 'state.json'), JSON.stringify({ checkedAt: new Date(now()).toISOString(), count: feed.entries.length }, null, 2));
    return { fresh: true, count: feed.entries.length };
  } catch (error) {
    await writeAtomic(join(dir, 'state.json'), JSON.stringify({ checkedAt: new Date(now()).toISOString(), failed: String(error?.name === 'TimeoutError' ? 'timeout' : error?.message ?? error).slice(0, 120) }, null, 2)).catch(() => {});
    return { fresh: false, error: true };
  }
}

// What this copy shows now: kept, checked again, for it, and on unless it is a security notice.
export async function currentNotices({ stateRoot, version, platform = process.platform, wsl = false, enabled = true, publicKey = NOTICES_PUBLIC_KEY, now = Date.now() } = {}) {
  const kept = (await readJson(join(folder(stateRoot), 'kept.json'))) ?? {};
  const seen = new Set((await readJson(join(folder(stateRoot), 'seen.json'))) ?? []);
  const { entries } = readFeed({ notices: kept.entries, retired: [] }, publicKey);
  const retired = new Set(Array.isArray(kept.retired) ? kept.retired : []);
  return entries
    .map((entry) => readNotice(entry.notice))
    .filter((notice) => notice && !retired.has(notice.id) && appliesTo(notice, { version, platform, wsl, now }) && (enabled || notice.level === 'security'))
    .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || b.from.localeCompare(a.from))
    .map((notice) => ({ ...notice, seen: seen.has(notice.id) }));
}

// «Got it»: this computer does not show it again.
export async function noticeSeen(stateRoot, id) {
  if (!ID.test(String(id))) return false;
  const file = join(folder(stateRoot), 'seen.json');
  const seen = new Set((await readJson(file)) ?? []);
  seen.add(id);
  await mkdir(folder(stateRoot), { recursive: true });
  await writeAtomic(file, JSON.stringify([...seen].slice(-200)));
  return true;
}
