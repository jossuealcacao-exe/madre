// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The ficha: what a request to MADRE carries to show it comes from the person (2026-11-02,
// external review #5).
//
// MADRE listens on 127.0.0.1, and request-guard.mjs keeps other web pages out. It did not keep out
// other programs: any process of this computer — of any user, and in WSL2 any program of Windows —
// could read a project's conversations, install a module that runs with the person's permissions,
// or open #4 by writing an Origin header by hand. Now every request that reads or changes something
// carries the ficha: a random secret in `~/.pulse/credentials/ficha.json`, readable only by the
// person's own user (0600 inside 0700), as Jupyter does with its token.
//
//  · The browser gets it once, in the address MADRE opens (`?ficha=…`): the page answers with a
//    cookie (HttpOnly, SameSite=Strict) and the same address without it. Cookies do not tell ports
//    apart, so the one cookie serves Home and every project of this computer.
//  · MADRE's own processes (the CLI, Home asking a project, a project asking another) read the file
//    and send it in the `x-madre-ficha` header.
//  · Home makes a new one each time it starts and opens the browser itself, so a ficha lives as
//    long as that run. A restart with no browser (an update, a project Home opens) keeps it, and
//    so do the tabs already open.
//
// What it does not stop, and is said in SECURITY.md: a program running as the person can read the
// file, as it can read everything else of theirs; and the cookie travels to any other port of
// 127.0.0.1 this browser visits.
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const FICHA_HEADER = 'x-madre-ficha';
export const FICHA_COOKIE = 'madre_ficha';
export const FICHA_PARAM = 'ficha';
// What a 401 says in its headers, so the page knows to reload into the page that explains it.
export const FICHA_NEEDED = 'needed';
const OWNER_ONLY = 0o600;
const OWNER_DIR = 0o700;
const FICHA_HEX = /^[0-9a-f]{64}$/;

export const defaultStateRoot = (env = process.env) => env.PULSE_HOME ?? join(homedir(), '.pulse');
export const fichaFile = (stateRoot) => join(stateRoot, 'credentials', 'ficha.json');

// The ficha on file, or null when there is none (or it is not one).
export async function readFicha(stateRoot) {
  try {
    const parsed = JSON.parse(await readFile(fichaFile(stateRoot), 'utf8'));
    return typeof parsed?.ficha === 'string' && FICHA_HEX.test(parsed.ficha) ? parsed.ficha : null;
  } catch { return null; }
}

// The ficha this run uses: the one on file, or a new one when there is none or `renew` asks for it.
// Written whole beside the name and renamed over it, so nobody reads half a ficha.
export async function ensureFicha(stateRoot, { renew = false } = {}) {
  if (!renew) {
    const kept = await readFicha(stateRoot);
    if (kept) return kept;
  }
  const dir = join(stateRoot, 'credentials');
  await mkdir(dir, { recursive: true, mode: OWNER_DIR });
  // An older credentials directory may predate this mode (src/vault.mjs does the same).
  await chmod(dir, OWNER_DIR).catch(() => {});
  const file = fichaFile(stateRoot);
  const draft = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const ficha = randomBytes(32).toString('hex');
  try {
    await writeFile(draft, `${JSON.stringify({ ficha, at: new Date().toISOString() })}\n`, { mode: OWNER_ONLY });
    await rename(draft, file);
  } finally {
    await rm(draft, { force: true });
  }
  await chmod(file, OWNER_ONLY).catch(() => {});
  return ficha;
}

// The ficha as the server checks it: read again when the file changes (Home renewed it while this
// project was open), never more than once a second.
export function fichaReader(stateRoot, { everyMs = 1000 } = {}) {
  let value = null;
  let seen = null;
  let checked = 0;
  return async () => {
    const now = Date.now();
    if (value && now - checked < everyMs) return value;
    checked = now;
    const info = await stat(fichaFile(stateRoot)).catch(() => null);
    const stamp = info ? `${info.mtimeMs}:${info.size}` : null;
    if (stamp !== seen || !value) { value = await readFicha(stateRoot); seen = stamp; }
    return value;
  };
}

// The header a MADRE process sends to another, or nothing when this computer has no ficha yet (a
// MADRE that does not ask for one does not need it).
export async function fichaHeaders(stateRoot = defaultStateRoot()) {
  const ficha = await readFicha(stateRoot);
  return ficha ? { [FICHA_HEADER]: ficha } : {};
}

// The address MADRE opens and prints: the page's own, with the ficha for the browser to keep.
export function withFicha(url, ficha) {
  if (!ficha) return url;
  const address = new URL(url);
  address.searchParams.set(FICHA_PARAM, ficha);
  return address.toString();
}

// Constant time, and never a throw on something that is not a string.
export function sameFicha(given, ficha) {
  if (typeof given !== 'string' || typeof ficha !== 'string' || !given || given.length !== ficha.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(ficha));
}

export function cookieFicha(cookieHeader) {
  for (const part of String(cookieHeader ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === FICHA_COOKIE) return rest.join('=');
  }
  return null;
}

// Whether a request carries this ficha, in its header or in the page's cookie.
export function carriesFicha(headers = {}, ficha) {
  return sameFicha(headers[FICHA_HEADER], ficha) || sameFicha(cookieFicha(headers.cookie), ficha);
}

export const fichaCookie = (ficha) => `${FICHA_COOKIE}=${ficha}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`;

// RIPLEY's preview runs in a sealed frame, whose requests carry no cookie, and the agents' headless
// browser (src/modules/playwright.mjs) has none either. Its pages are served under a key of their own,
// made from the ficha: it opens the preview of this project's files and nothing else, and it says
// nothing of the ficha it comes from.
export const previewKey = (ficha) => createHmac('sha256', ficha).update('madre preview').digest('hex').slice(0, 32);
