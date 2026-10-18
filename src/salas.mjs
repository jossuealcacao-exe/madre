// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Salas on the Mac (docs/MACROVERSO.md, phase 1): every room this Mac knows, open or asleep, and
// what one room may ask of another — to open, to close. The list is read from what each room
// leaves beside its record; nothing here touches a room's ledger or its memory.
//
// A room opened from here is opened the way `madre start` opens it, by the same `bin/madre.mjs`,
// without a shell: the folder is an argument, never a line for `sh` or `cmd.exe` to read
// (docs/WINDOWS.md, WIN-016), and the script is found with fileURLToPath, never `.pathname`
// (WIN-004). A room is closed by asking it to close, the way a signal closes it; nothing here
// kills a process (WIN-007).

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, openSync, realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oneAtATime, writeWhole } from './json-file.mjs';

const MADRE_BIN = fileURLToPath(new URL('../bin/madre.mjs', import.meta.url));

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const readJson = (file) => readFile(file, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);

// The id of a room: the project's folder name and a hash of its path. Written once, here, so
// the server, a link and the room of Salas all name a folder the same way (the server re-exports
// it). It cannot be turned back into the path, which is why `project.json` keeps it (S-002).
export function projectRoomId(projectRoot) {
  const path = resolve(projectRoot);
  const digest = createHash('sha256').update(path).digest('hex').slice(0, 16);
  return `${basename(path) || 'root'}-${digest}`;
}

// The room of Salas (docs/MACROVERSO.md, D-S08): BISHOP's notebook is a folder of MADRE's own,
// `~/.pulse/salas`, and its room has the id any project in that folder would have. The room is
// made in phase 3d; its id is needed before that, because a link already has rules about it (a
// link never serves from it, and orders only reach the room at its other end).
//
// The id is the one `createPulseServer` would give the folder: it names a room by the real path
// of its project, so the state root is resolved the same way here (a `PULSE_HOME` under /tmp is
// really under /private/tmp on a Mac) and the id is the same before and after the folder exists.
export const salasProjectRoot = (stateRoot) => join(stateRoot, 'salas');
export function salasRoomId(stateRoot) {
  return projectRoomId(realFolder(salasProjectRoot(stateRoot)));
}

// The real path of a folder; while it is not there yet, the real path of its parent and its name.
// Two spellings of one folder compare equal this way, with or without a link in the path, and a
// folder about to be made compares equal to itself once made. Never the text as given.
function realFolder(path) {
  const given = resolve(path);
  try { return realpathSync(given); } catch { /* not there yet */ }
  let parent = dirname(given);
  try { parent = realpathSync(parent); } catch { /* nor its parent: as given */ }
  return join(parent, basename(given));
}

// Is this project the notebook of Salas, that is, is this room the room of Salas (phase 3d)?
// Asked of real paths on both sides, as the server names its own project.
export function isSalasRoom(projectRoot, stateRoot) {
  return realFolder(projectRoot) === realFolder(salasProjectRoot(stateRoot));
}

// The notebook is made the first time something opens it, and made empty: a folder and nothing
// in it. What the room keeps (its record, its memory) stays beside its record, as for any room.
// A notebook already there is left as it is.
export async function ensureSalasProject(stateRoot) {
  const folder = salasProjectRoot(stateRoot);
  await mkdir(folder, { recursive: true });
  return folder;
}

// Which project a run of `madre` is about (D-S09, revised 2026-10-10), said once and with nothing
// started, so the rule can be tested as a rule. `--project` wins, always. The lobby — the process
// that serves the list of projects and where BISHOP lives, whose folder is MADRE's own
// `~/.pulse/salas` — is opened by `madre lobby` and `madre salas`, by a bare `madre` (or
// `npx madre`) with no command word at all, and by `madre start` from the home folder, the one
// folder that is nobody's project. `madre start` anywhere else opens that folder, as it always
// did. No guess about what looks like a project; `cwd` and `home` are compared as real paths.
// `named` is false only when no command word was written; left out, the command was written.
export function projectRootFor({ command, named = true, project, cwd, home, stateRoot }) {
  if (typeof project === 'string' && project) return resolve(project);
  const lobby = command === 'salas' || command === 'lobby' || (command === 'start' && !named) || realFolder(cwd) === realFolder(home);
  if (lobby) return resolve(salasProjectRoot(stateRoot));
  return resolve(cwd);
}

// Where the project is, kept beside its record (S-002): the room's id is a hash of the path and
// cannot be turned back into it, and a room that is closed has to be found to be opened again.
// Written whole or not at all.
export async function markProject(roomDir, projectRoot, { now = new Date() } = {}) {
  await mkdir(roomDir, { recursive: true });
  const file = join(roomDir, 'project.json');
  await oneAtATime(file, () => writeWhole(file, `${JSON.stringify({ root: projectRoot, name: basename(projectRoot), lastOpened: now.toISOString() })}\n`));
}

// ---- The lobby: adding projects (2026-10-10). A browser cannot hand MADRE the path of a folder,
// so the lobby browses the folders itself, from this Mac, inside the home folder and nowhere
// else: names of folders, and whether a folder looks like a project (a marker file is there),
// never what any file says. Associating a project only writes where it is beside its record, as
// `madre start` would the first time; nothing is started. A folder already used with MADRE gets
// the same id it had, so its conversations and its memory are there when it is entered.
const PROJECT_MARKS = ['.git', 'package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod', 'composer.json', 'Gemfile', 'pom.xml', 'build.gradle', 'Package.swift', 'deno.json', '.pulse'];
const NOT_PROJECTS = new Set(['node_modules', 'Library', 'Applications', 'Pictures', 'Music', 'Movies', 'Public', 'OneDrive', 'Dropbox']);
// Where people keep their projects, looked at one level deep for suggestions. MADRE speaks Spanish
// first, and so do the folders of many who use it (a Linux in Spanish names them Documentos and
// Escritorio).
export const PROJECT_HOMES = ['', 'Projects', 'projects', 'Proyectos', 'proyectos', 'Developer', 'dev', 'Dev', 'code', 'Code', 'src', 'repos', 'Repos', 'GitHub', 'git', 'work', 'Work', 'Sites', 'Documents', 'Documentos', 'Desktop', 'Escritorio'];

const inside = (child, parent) => child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
async function looksLikeProject(folder) {
  for (const mark of PROJECT_MARKS) if (await stat(join(folder, mark)).then(() => true, () => false)) return true;
  return false;
}
// The folders already in the lobby, by where they are and by their id: a room on an older MADRE
// may be open without having written where its project is, and its id still names its folder.
async function knownRoots(stateRoot) {
  const rooms = await knownRooms(stateRoot);
  const roots = new Set(rooms.map((room) => room.root).filter(Boolean).map((root) => realFolder(root)));
  const ids = new Set(rooms.map((room) => room.id));
  return { has: (folder) => roots.has(folder) || ids.has(projectRoomId(folder)) };
}

// The folders inside one folder of the home, the projects first. Refused outside the home.
export async function listFolders({ path = null, home, stateRoot }) {
  const top = realFolder(home);
  const here = realFolder(path ?? home);
  if (!inside(here, top)) return { error: 'outside' };
  const info = await stat(here).catch(() => null);
  if (!info?.isDirectory()) return { error: 'missing' };
  const known = await knownRoots(stateRoot);
  const state = realFolder(stateRoot);
  const names = await readdir(here, { withFileTypes: true }).catch(() => []);
  const entries = [];
  for (const entry of names) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || NOT_PROJECTS.has(entry.name)) continue;
    const full = join(here, entry.name);
    if (inside(full, state)) continue;
    entries.push({ name: entry.name, path: full, project: await looksLikeProject(full), known: known.has(full) });
  }
  entries.sort((a, b) => Number(b.project) - Number(a.project) || a.name.localeCompare(b.name));
  return { path: here, home: top, parent: here === top ? null : dirname(here), entries: entries.slice(0, 400) };
}

// Folders that look like projects in the places people keep them, newest first, none already here.
export async function suggestProjects({ home, stateRoot, limit = 24 }) {
  const top = realFolder(home);
  const known = await knownRoots(stateRoot);
  const state = realFolder(stateRoot);
  const seen = new Map();
  const places = new Set();   // `Projects` and `projects` are one folder on a Mac: read it once
  for (const place of PROJECT_HOMES) {
    const base = join(top, place);
    const info = await stat(base).catch(() => null);
    if (!info?.isDirectory() || places.has(`${info.dev}:${info.ino}`)) continue;
    places.add(`${info.dev}:${info.ino}`);
    const names = await readdir(base, { withFileTypes: true }).catch(() => []);
    for (const entry of names) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || NOT_PROJECTS.has(entry.name)) continue;
      const full = join(base, entry.name);
      if (seen.has(full) || known.has(full) || inside(full, state) || !(await looksLikeProject(full))) continue;
      const when = (await stat(full).catch(() => null))?.mtimeMs ?? 0;
      seen.set(full, { name: entry.name, path: full, when });
    }
  }
  return [...seen.values()].sort((a, b) => b.when - a.when).slice(0, limit).map(({ name, path }) => ({ name, path }));
}

// Associates one folder with the lobby: a project inside the home, not the home itself and not
// MADRE's own state. Its record says where it is; a record already there keeps when it was last
// opened. Answers the room's id.
export async function associateProject({ root, home, stateRoot, now = new Date() }) {
  const folder = realFolder(String(root ?? ''));
  const top = realFolder(home);
  if (!root || !inside(folder, top) || folder === top) return { error: 'outside' };
  if (inside(folder, realFolder(stateRoot))) return { error: 'madre' };
  const info = await stat(folder).catch(() => null);
  if (!info?.isDirectory()) return { error: 'missing' };
  const id = projectRoomId(folder);
  const roomDir = join(stateRoot, 'rooms', id);
  await mkdir(roomDir, { recursive: true });
  const file = join(roomDir, 'project.json');
  const before = await oneAtATime(file, async () => {
    const was = await readJson(file);
    await writeWhole(file, `${JSON.stringify({ root: folder, name: basename(folder), lastOpened: was?.lastOpened ?? null, added: was?.added ?? now.toISOString() })}\n`);
    return was;
  });
  return { id, name: basename(folder), root: folder, already: Boolean(before) };
}

// A new project, from nothing (2026-10-17): a folder made where the person chose, inside the home
// folder, and added to Home like any other. The name is held to what any system refuses in a folder
// name, the strictest set (separators, reserved characters, a trailing dot or space, device names),
// so a name is only ever one folder, never a path, a device or a hidden folder.
const DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
export function projectNameProblem(name) {
  const text = String(name ?? '');
  if (!text.trim()) return 'empty';
  if (text.length > 120) return 'long';
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(text) || text !== text.trim() || /[. ]$/.test(text) || text.startsWith('.') || DEVICE_NAMES.test(text)) return 'name';
  return null;
}
export async function createProject({ name, parent = null, home, stateRoot, now = new Date() }) {
  const problem = projectNameProblem(name);
  if (problem) return { error: problem };
  const top = realFolder(home);
  const place = realFolder(parent || home);
  if (!inside(place, top)) return { error: 'outside' };
  if (inside(place, realFolder(stateRoot))) return { error: 'madre' };
  if (!(await stat(place).catch(() => null))?.isDirectory()) return { error: 'missing' };
  const folder = join(place, String(name));
  if (dirname(folder) !== place) return { error: 'name' };
  try { await mkdir(folder); } catch (error) { return { error: error?.code === 'EEXIST' ? 'exists' : 'missing' }; }
  return { ...(await associateProject({ root: folder, home, stateRoot, now })), created: true };
}

// Takes a project out of MADRE (2026-10-10): its record of where it is goes aside, so Home no
// longer lists it. Nothing in the project's folder is touched, and its conversations and its
// memory stay beside the record: added again, the folder gets the same id and finds them there.
// A room that is open is closed first, by whoever calls; one with no record has nothing to forget.
export async function forgetProject({ stateRoot, id }) {
  if (typeof id !== 'string' || !/^[^/\\]+$/.test(id) || id === '.' || id === '..') return { error: 'unknown' };
  const roomDir = join(stateRoot, 'rooms', id);
  const file = join(roomDir, 'project.json');
  const record = await readJson(file);
  if (!record) return { error: 'unknown' };
  await rename(file, join(roomDir, 'project.forgotten.json'));
  return { id, name: typeof record.name === 'string' ? record.name : id, root: typeof record.root === 'string' ? record.root : null };
}

// Every room: the ones open now, and the ones asleep whose project is still on disk. A folder
// with neither (a test's, a temporary one, a room from before MADRE kept the path) is not
// offered: there is nothing to open (S-004).
export async function knownRooms(stateRoot) {
  const dir = join(stateRoot, 'rooms');
  const names = await readdir(dir).catch(() => []);
  const out = [];
  for (const id of names) {
    const mark = await readJson(join(dir, id, 'open.json'));
    const where = await readJson(join(dir, id, 'project.json'));
    const open = mark && Number.isInteger(mark.pid) && Number.isInteger(mark.port) && mark.port > 0 && mark.port < 65536 && alive(mark.pid)
      ? { port: mark.port, pid: mark.pid, version: mark.version ?? null, at: mark.at ?? null }
      : null;
    const root = typeof where?.root === 'string' ? where.root : null;
    const there = root ? await stat(root).then((info) => info.isDirectory()).catch(() => false) : false;
    if (!open && !there) continue;
    out.push({
      id,
      name: typeof where?.name === 'string' ? where.name : typeof mark?.project === 'string' ? mark.project : id.replace(/-[0-9a-f]{16}$/, ''),
      root: there ? root : null,
      lastOpened: where?.lastOpened ?? mark?.at ?? null,
      open,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Opens a room for a project, as `madre start --project <root> --no-open` would. What it says on
// the way up lands in start.log beside its record: if it never comes up, that file says why.
export function startRoom({ projectRoot, roomDir, env = process.env, spawnImpl = spawn, bin = MADRE_BIN }) {
  let log = 'ignore';
  try { log = openSync(join(roomDir, 'start.log'), 'a'); } catch { /* no witness, still start */ }
  // The new room is its own: what this room set for itself on the way up is not handed on.
  const own = { ...env };
  for (const name of ['PULSE_UPDATE_RESTART', 'PULSE_OUTBOUND_LOG']) delete own[name];
  try {
    const child = spawnImpl(process.execPath, [bin, 'start', '--project', projectRoot, '--no-open'], {
      cwd: projectRoot,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['ignore', log, log],
      env: own,
    });
    child.unref?.();
    return child;
  } finally {
    if (typeof log === 'number') { try { closeSync(log); } catch { /* the child keeps its own copy */ } }
  }
}

// Waits until the room for that id is open and answers, or the time runs out.
// A minute (2026-10-12): a Mac busy with other projects took over 25 s to bring one up, and Home
// said it did not open while it was opening.
export async function roomComesUp(stateRoot, id, { timeoutMs = 60000, everyMs = 300, fetchImpl = globalThis.fetch } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const room = (await knownRooms(stateRoot)).find((one) => one.id === id);
    if (room?.open) {
      const answers = await fetchImpl(`http://127.0.0.1:${room.open.port}/api/version`, { signal: AbortSignal.timeout(1000) }).then((response) => response.ok).catch(() => false);
      if (answers) return room;
    }
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
  return null;
}

// What the Macroverso needs of a room's archive to draw it as a NOSTROMO, and nothing more. Without
// `full`, no memory's words leave their room: a far universe is drawn from kinds, zones, how much
// ledger each memory covers, how often it was reached for, and the links between them. Only the
// chosen universe asks for the words, and only the Mac may ask (the route refuses a phone).
export function universeOf(research, { full = false } = {}) {
  const memories = (research?.memories ?? []).map((memory) => ({
    id: memory.id,
    kind: memory.kind,
    zone: memory.zone ?? 'hold',
    fromSequence: memory.fromSequence ?? 0,
    throughSequence: memory.throughSequence ?? 0,
    sourcesCount: Array.isArray(memory.sources) ? memory.sources.length : 0,
    recalled: memory.recalled ?? 0,
    lastRecalled: memory.lastRecalled ?? null,
    cold: memory.cold ?? null,
    ...(full ? { text: memory.text ?? '', agent: memory.agent ?? null, origin: memory.origin ?? null, created: memory.created ?? null } : {}),
  }));
  const ids = new Set(memories.map((memory) => memory.id));
  const links = (research?.links ?? []).filter((link) => ids.has(link.a) && ids.has(link.b)).map((link) => ({ a: link.a, b: link.b, weight: link.weight ?? 0.5 }));
  return {
    memories,
    links,
    maturity: research?.maturity ?? null,
    stats: { entries: research?.stats?.entries ?? 0, embeddings: research?.stats?.embeddings ?? 0 },
  };
}

// What a room says about itself, read from its own page's address. A room on an older MADRE
// answers 404 to the routes it does not have yet, and is said to be outdated (S-005).
export async function askRoom(port, path, { method = 'GET', body = null, fetchImpl = globalThis.fetch, timeoutMs = 1500 } = {}) {
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { outdated: true };
    const answer = await response.json().catch(() => ({}));
    return response.ok ? answer : { unreachable: true, status: response.status, error: answer?.error ?? null };
  } catch {
    return { unreachable: true };
  }
}
