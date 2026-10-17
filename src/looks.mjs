// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// How the person wants MADRE to look, once for every page (2026-10-12). Each project is its own
// origin — another port — and Home is one more, so what a browser keeps for one is invisible to
// the others: the dark theme chosen in Home left every project light. The choices live here, in
// ~/.pulse/looks.json, beside tour.json and whats-new.json; every page reads them when it opens or
// comes back into view, and writes them when the person changes one. The browser's own copy stays,
// so a page paints in the last known look before it hears from here.
//
// Only what the pages share: the theme, the accent, the wallpaper and its dials, the bubbles and
// the text of the conversation. How Home is arranged lives beside it, in home.json (below).

import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { oneAtATime, writeWhole } from './json-file.mjs';

const CHOICE = /^[a-z][a-z0-9-]{0,23}$/;
const NUMBER = /^\d{1,3}$/;
export const LOOK_KEYS = {
  'pulse.theme': CHOICE,
  'pulse.accent': CHOICE,
  'pulse.wallpaper': CHOICE,
  'pulse.wallpaper.style': CHOICE,
  'pulse.wallpaper.veil': NUMBER,
  'pulse.wallpaper.blur': NUMBER,
  'pulse.bubbles': CHOICE,
  'pulse.text': CHOICE,
};
const looksFile = (stateRoot) => join(stateRoot, 'looks.json');

// A project may keep a wallpaper of its own (2026-10-13): the person said «only in this project».
// It lives beside the shared looks, under `rooms`, by the room's id; every other look stays shared.
const ROOM_ID = /^[\w .-]{1,120}$/;
const readFileLooks = (stateRoot) => readFile(looksFile(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
function roomsOf(raw) {
  const rooms = {};
  for (const [id, own] of Object.entries(raw?.rooms ?? {})) {
    if (ROOM_ID.test(id) && typeof own?.wallpaper === 'string' && CHOICE.test(own.wallpaper)) rooms[id] = { wallpaper: own.wallpaper };
  }
  return rooms;
}

// What is kept, read key by key: anything else in the file, or a value of the wrong shape, is not
// a look. `null` for a key means the first value — the room as it always was. With `room`, that
// project's own wallpaper comes back too, as `own`.
export async function readLooks(stateRoot, { room = null } = {}) {
  const raw = await readFileLooks(stateRoot);
  const looks = {};
  for (const [key, shape] of Object.entries(LOOK_KEYS)) {
    const value = raw?.looks?.[key];
    looks[key] = typeof value === 'string' && shape.test(value) ? value : null;
  }
  const answer = { looks, saved: Boolean(raw && typeof raw.looks === 'object') };
  if (room) answer.own = roomsOf(raw)[room] ?? null;
  return answer;
}
// Every project's own wallpaper, for Home's cards.
export async function roomLooks(stateRoot) {
  return roomsOf(await readFileLooks(stateRoot));
}
// A project's own wallpaper set, or taken away (`null`): it follows the shared one again.
export function changeRoomLook(stateRoot, room, wallpaper) {
  return oneAtATime(looksFile(stateRoot), async () => {
    if (typeof room !== 'string' || !ROOM_ID.test(room)) return { error: 'room' };
    if (wallpaper !== null && (typeof wallpaper !== 'string' || !CHOICE.test(wallpaper))) return { error: 'value' };
    const raw = await readFileLooks(stateRoot);
    const { looks } = await readLooks(stateRoot);
    const rooms = roomsOf(raw);
    if (wallpaper === null) delete rooms[room]; else rooms[room] = { wallpaper };
    await writeWhole(looksFile(stateRoot), `${JSON.stringify({ looks, ...(Object.keys(rooms).length ? { rooms } : {}), at: new Date().toISOString() }, null, 2)}\n`);
    return { own: rooms[room] ?? null };
  });
}

// A change from a page: the keys it names, set or cleared. A key it does not know, or a value of
// the wrong shape, refuses the whole change rather than half of it.
export function changeLooks(stateRoot, patch, now = new Date()) {
  return oneAtATime(looksFile(stateRoot), async () => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'looks' };
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.hasOwn(LOOK_KEYS, key)) return { error: 'key' };
      if (value !== null && (typeof value !== 'string' || !LOOK_KEYS[key].test(value))) return { error: 'value' };
    }
    const { looks } = await readLooks(stateRoot);
    Object.assign(looks, patch);
    const rooms = roomsOf(await readFileLooks(stateRoot));
    await writeWhole(looksFile(stateRoot), `${JSON.stringify({ looks, ...(Object.keys(rooms).length ? { rooms } : {}), at: new Date(now).toISOString() }, null, 2)}\n`);
    return { looks, saved: true };
  });
}

// HOME, ARRANGED ONCE (2026-10-16). Home is shown by whichever process answers /salas — the
// Coordinator's, or any project's — and each is another port, so the arrangement Home kept in the
// browser was lost on every other page and whenever MADRE came back on another port. What the
// person arranged lives here, in ~/.pulse/home.json: the tiles and their sizes, the order of the
// projects, the projects on the bar, and how the cards read. Kept as the page keeps them (the same
// keys, the same text), each checked for its shape before it is written.
const homeFile = (stateRoot) => join(stateRoot, 'home.json');
const HOME_TEXT = 8000;
const isIds = (value) => Array.isArray(value) && value.length <= 500 && value.every((id) => typeof id === 'string' && id.length <= 200);
export const HOME_KEYS = {
  'pulse.home.layout': (value) => { try { const raw = JSON.parse(value); return Boolean(raw) && typeof raw === 'object' && !Array.isArray(raw) && (raw.order === undefined || isIds(raw.order)); } catch { return false; } },
  'pulse.home.projects': (value) => { try { return isIds(JSON.parse(value)); } catch { return false; } },
  'pulse.lobbyBar': (value) => { try { return isIds(JSON.parse(value)); } catch { return false; } },
  'pulse.home.cards': (value) => CHOICE.test(value),
  'pulse.home.text': (value) => CHOICE.test(value),
  'pulse.home.order': (value) => CHOICE.test(value),
};
export async function readHome(stateRoot) {
  const raw = await readFile(homeFile(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  const home = {};
  for (const [key, valid] of Object.entries(HOME_KEYS)) {
    const value = raw?.home?.[key];
    home[key] = typeof value === 'string' && value.length <= HOME_TEXT && valid(value) ? value : null;
  }
  return { home, saved: Boolean(raw && typeof raw.home === 'object') };
}
export function changeHome(stateRoot, patch, now = new Date()) {
  return oneAtATime(homeFile(stateRoot), async () => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { error: 'home' };
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.hasOwn(HOME_KEYS, key)) return { error: 'key' };
      if (value !== null && (typeof value !== 'string' || value.length > HOME_TEXT || !HOME_KEYS[key](value))) return { error: 'value' };
    }
    const { home } = await readHome(stateRoot);
    Object.assign(home, patch);
    await writeWhole(homeFile(stateRoot), `${JSON.stringify({ home, at: new Date(now).toISOString() }, null, 2)}\n`);
    return { home, saved: true };
  });
}

// YOUR OWN WALLPAPER (1.0.3). One picture of the person's, for every page that chooses it (the
// choice is still each page's own: `pulse.wallpaper` = 'custom'). The page reads the picture,
// fits it (no longer side than WALLPAPER_SIDE), encodes it and takes its colours for the veil, the
// mesh and the tint, the way the wallpapers that ship were made by hand; here it is kept as it
// came: the picture, and beside it what it is (`custom.json`). Only a picture is kept: its first
// bytes say WebP, JPEG or PNG, or nothing is written. Never an SVG: it can carry a script.
export const WALLPAPER_BYTES = 8 * 1024 * 1024;
const wallDir = (stateRoot) => join(stateRoot, 'wallpaper');
const wallMeta = (stateRoot) => join(wallDir(stateRoot), 'custom.json');
const PICTURES = [
  { type: 'image/webp', ext: 'webp', is: (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  { type: 'image/jpeg', ext: 'jpg', is: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', is: (b) => b.length > 8 && b.toString('latin1', 1, 4) === 'PNG' && b[0] === 0x89 },
];
const RGB = (value) => Array.isArray(value) && value.length === 3 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
const SCHEME = (value) => Boolean(value) && RGB(value.veil) && RGB(value.tint) && Array.isArray(value.mesh) && value.mesh.length === 3 && value.mesh.every(RGB);
const PERCENT = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
// What a page sends about the picture, checked one field at a time.
function wallShape(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const w = Number(meta.w);
  const h = Number(meta.h);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 20000 || h > 20000) return null;
  if (!SCHEME(meta.palette?.dark) || !SCHEME(meta.palette?.light)) return null;
  const x = Number(meta.focus?.x ?? 50);
  const y = Number(meta.focus?.y ?? 50);
  if (!PERCENT(x) || !PERCENT(y)) return null;
  const pick = (one) => ({ veil: one.veil, tint: one.tint, mesh: one.mesh });
  return { w, h, focus: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }, palette: { dark: pick(meta.palette.dark), light: pick(meta.palette.light) } };
}
// The picture kept, as a page reads it: its version (a hash of its bytes), its type, its size, where
// it is framed and its colours. `null` when there is none, or what is there cannot be trusted.
export async function readWallpaper(stateRoot) {
  const raw = await readFile(wallMeta(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
  const shape = wallShape(raw);
  const kind = PICTURES.find((one) => one.type === raw?.type);
  if (!shape || !kind || typeof raw.v !== 'string' || !/^[0-9a-f]{8,64}$/.test(raw.v)) return null;
  return { v: raw.v, type: kind.type, ...shape };
}
export async function wallpaperBytes(stateRoot) {
  const meta = await readWallpaper(stateRoot);
  if (!meta) return null;
  const kind = PICTURES.find((one) => one.type === meta.type);
  const bytes = await readFile(join(wallDir(stateRoot), `custom.${kind.ext}`)).catch(() => null);
  return bytes ? { bytes, type: meta.type, v: meta.v } : null;
}
export function saveWallpaper(stateRoot, bytes, meta) {
  return oneAtATime(wallMeta(stateRoot), async () => {
    if (!Buffer.isBuffer(bytes) || !bytes.length) return { error: 'empty' };
    if (bytes.length > WALLPAPER_BYTES) return { error: 'size' };
    const kind = PICTURES.find((one) => one.is(bytes));
    if (!kind) return { error: 'type' };
    const shape = wallShape(meta);
    if (!shape) return { error: 'meta' };
    const v = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    await writeWhole(join(wallDir(stateRoot), `custom.${kind.ext}`), bytes);
    for (const other of PICTURES) if (other !== kind) await rm(join(wallDir(stateRoot), `custom.${other.ext}`), { force: true });
    await writeWhole(wallMeta(stateRoot), `${JSON.stringify({ v, type: kind.type, ...shape, at: new Date().toISOString() }, null, 2)}\n`);
    return { custom: { v, type: kind.type, ...shape } };
  });
}
// Where the picture is framed: the point of it that stays in view when the screen crops it.
export function frameWallpaper(stateRoot, focus) {
  return oneAtATime(wallMeta(stateRoot), async () => {
    const raw = await readFile(wallMeta(stateRoot), 'utf8').then((text) => JSON.parse(text)).catch(() => null);
    if (!raw) return { error: 'none' };
    const shape = wallShape({ ...raw, focus });
    if (!shape) return { error: 'value' };
    await writeWhole(wallMeta(stateRoot), `${JSON.stringify({ ...raw, focus: shape.focus, at: new Date().toISOString() }, null, 2)}\n`);
    return { custom: await readWallpaper(stateRoot) };
  });
}
export function dropWallpaper(stateRoot) {
  return oneAtATime(wallMeta(stateRoot), async () => {
    for (const kind of PICTURES) await rm(join(wallDir(stateRoot), `custom.${kind.ext}`), { force: true });
    await rm(wallMeta(stateRoot), { force: true });
    return { custom: null };
  });
}
