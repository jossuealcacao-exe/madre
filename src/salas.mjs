// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
import { closeSync, realpathSync } from 'node:fs';
import { mkdir, open, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import * as nodePath from 'node:path';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oneAtATime, writeWhole } from './json-file.mjs';
import { defaultStateRoot, fichaHeaders, openPrivateLog } from './ficha.mjs';

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
// Written whole or not at all. With the port it opened on (L-6): what else the record holds stays.
export async function markProject(roomDir, projectRoot, { now = new Date(), port = null, keepOpen = null } = {}) {
  await mkdir(roomDir, { recursive: true });
  const file = join(roomDir, 'project.json');
  await oneAtATime(file, async () => {
    const was = await readJson(file);
    await writeWhole(file, `${JSON.stringify({ ...(was ?? {}), root: projectRoot, name: basename(projectRoot), lastOpened: now.toISOString(), ...(Number.isInteger(port) ? { port } : {}), ...(typeof keepOpen === 'boolean' ? { keepOpen } : {}) })}\n`);
  });
}

// Whether a project comes back when MADRE starts as a service (L-3): set when it opens, taken away
// only when the person closes it. A restart of the computer or a fall of MADRE leaves it on.
export async function keepOpenProject(stateRoot, id, keepOpen) {
  if (typeof id !== 'string' || !/^[^/\\]+$/.test(id) || id === '.' || id === '..') return false;
  const file = join(stateRoot, 'rooms', id, 'project.json');
  return oneAtATime(file, async () => {
    const was = await readJson(file);
    if (!was) return false;
    await writeWhole(file, `${JSON.stringify({ ...was, keepOpen: Boolean(keepOpen) })}\n`);
    return true;
  });
}

// Each project keeps its port (L-6, Carlos's server, 2026-11-04). A project opened from Home took
// the first free port from 4317, so its number depended on the order things were opened in and
// changed after a restart; on a server reached through a tunnel the new one fell outside the
// tunnel, and links between projects need the same number on both ends. What a project opened on
// is kept in its record; the next time it asks for that one first, and a project with none skips
// the ports other projects already keep.
export async function keptPorts(stateRoot, projectRoot) {
  const mine = projectRoomId(projectRoot);
  const dir = join(stateRoot, 'rooms');
  const others = new Set();
  let own = null;
  for (const id of await readdir(dir).catch(() => [])) {
    const port = (await readJson(join(dir, id, 'project.json')))?.port;
    if (!Number.isInteger(port)) continue;
    if (id === mine) own = port; else others.add(port);
  }
  return { mine: own, others };
}

// The port to try: its own when it has one and it is free, else the first free one from `base`
// that no other project keeps. `taken(port)` says whether something is listening there.
export async function choosePort({ base, mine = null, others = new Set(), taken }) {
  if (Number.isInteger(mine) && !(await taken(mine))) return mine;
  let port = base;
  while (others.has(port) || await taken(port)) port += 1;
  return port;
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

// Whether a folder is the other one or inside it (WIN-028, 2026-10-28). Asked of the path module of
// the system it runs on, not of a '/': on Windows a path is written with '\' and its letters' case
// does not tell two folders apart, and comparing text with '/' refused every folder there, the
// home's own included («Only folders inside your home folder»). `path` is a parameter so the
// Windows rule can be checked anywhere.
export function insideFolder(child, parent, path = nodePath) {
  const rel = path.relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}
export const sameFolder = (one, other, path = nodePath) => path.relative(one, other) === '';
const inside = (child, parent) => insideFolder(child, parent);
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
  return { path: here, home: top, parent: sameFolder(here, top) ? null : dirname(here), entries: entries.slice(0, 400) };
}

// Folders that look like projects in the places people keep them, newest first, none already here.
// Since 1.1 (the welcome of 2026-11-08, docs/private/BIENVENIDA-1.1.md) also the folders the
// person already opened with another tool, each saying which: like moving to a new phone, what was
// there comes along. Only the folder paths those tools keep are read, never a conversation, a key or
// a setting (see foldersFromTools).
export async function suggestProjects({ home, stateRoot, limit = 24, tools = true, platform = process.platform }) {
  const top = realFolder(home);
  const known = await knownRoots(stateRoot);
  const state = realFolder(stateRoot);
  const seen = new Map();
  const places = new Set();   // `Projects` and `projects` are one folder on a Mac: read it once
  const keep = async (full, from = null) => {
    const real = realFolder(full);
    if (known.has(real) || inside(real, state)) return;
    const had = seen.get(real);
    if (had) { if (from && !had.from.includes(from)) had.from.push(from); return; }
    const info = await stat(real).catch(() => null);
    if (!info?.isDirectory()) return;
    seen.set(real, { name: basename(real), path: real, when: info.mtimeMs ?? 0, from: from ? [from] : [] });
  };
  if (tools) for (const { path, from } of await foldersFromTools({ home: top, platform })) {
    const real = realFolder(path);
    if (!toolFolderFits(real, top)) continue;
    await keep(real, from);
  }
  for (const place of PROJECT_HOMES) {
    const base = join(top, place);
    const info = await stat(base).catch(() => null);
    if (!info?.isDirectory() || places.has(`${info.dev}:${info.ino}`)) continue;
    places.add(`${info.dev}:${info.ino}`);
    const names = await readdir(base, { withFileTypes: true }).catch(() => []);
    for (const entry of names) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || NOT_PROJECTS.has(entry.name)) continue;
      const full = join(base, entry.name);
      if (seen.has(realFolder(full)) || !(await looksLikeProject(full))) continue;
      await keep(full);
    }
  }
  // What another tool already knows comes first, then the rest; the newest first in each.
  return [...seen.values()]
    .sort((a, b) => Number(b.from.length > 0) - Number(a.from.length > 0) || b.when - a.when)
    .slice(0, limit)
    .map(({ name, path, when, from }) => ({ name, path, when: when ? new Date(when).toISOString() : null, from }));
}

// A folder another tool knows is offered only inside the home, never the home itself, a folder
// hidden anywhere on its way (a worktree under .claude/, a tool's own state) or one of the places
// that hold everything (Documents, Desktop…): those are where projects live, not projects.
const HOLDERS = new Set(['documents', 'documentos', 'desktop', 'escritorio', 'downloads', 'descargas', ...PROJECT_HOMES.filter(Boolean).map((one) => one.toLowerCase())]);
export function toolFolderFits(folder, home, path = nodePath) {
  if (!insideFolder(folder, home, path) || sameFolder(folder, home, path)) return false;
  const parts = path.relative(home, folder).split(path.sep);
  if (parts.some((part) => part.startsWith('.') || NOT_PROJECTS.has(part))) return false;
  return !(parts.length === 1 && HOLDERS.has(parts[0].toLowerCase()));
}

// The folders other tools on this computer already worked in, by tool. Each one is read for paths
// and nothing else, and a tool that is not there, or writes its file differently, simply adds none:
//   claude    ~/.claude.json, the names of its `projects` (Claude Code keeps one entry per folder)
//   codex     ~/.codex/sessions, the `cwd` on the first line of the newest sessions
//   gemini    ~/.gemini/projects.json, the names of its `projects`
//   cursor    Cursor's storage.json, the folders of its recent windows
//   vscode    the same file of Visual Studio Code
// In WSL, Cursor and VS Code keep theirs on the Windows side: only Linux's own are read.
export const TOOL_NAMES = { claude: 'Claude Code', codex: 'Codex', gemini: 'Gemini', cursor: 'Cursor', vscode: 'VS Code' };
const CODEX_SESSIONS_READ = 300;
export async function foldersFromTools({ home, platform = process.platform }) {
  const found = [];
  const add = (path, from) => { if (typeof path === 'string' && nodePath.isAbsolute(path)) found.push({ path, from }); };
  const claude = await readJson(join(home, '.claude.json'));
  for (const path of Object.keys(claude?.projects ?? {})) add(path, 'claude');
  const gemini = await readJson(join(home, '.gemini', 'projects.json'));
  for (const path of Object.keys(gemini?.projects ?? {})) add(path, 'gemini');
  for (const path of await codexFolders(join(home, '.codex', 'sessions'))) add(path, 'codex');
  const appData = platform === 'darwin' ? join(home, 'Library', 'Application Support') : join(home, '.config');
  for (const [from, app] of [['cursor', 'Cursor'], ['vscode', 'Code']]) {
    const storage = await readJson(join(appData, app, 'User', 'globalStorage', 'storage.json'));
    const uris = [...Object.keys(storage?.profileAssociations?.workspaces ?? {}), ...(storage?.backupWorkspaces?.folders ?? []).map((one) => one?.folderUri)];
    for (const uri of uris) { if (typeof uri === 'string' && uri.startsWith('file://')) { try { add(fileURLToPath(uri), from); } catch { /* not a local folder */ } } }
  }
  return found;
}
// Codex writes one file per session under year/month/day; the newest are read, and of each only its
// first line, the one that says where the session ran.
async function codexFolders(root) {
  const files = [];
  const walk = async (dir, depth) => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => b.name.localeCompare(a.name))) {
      if (files.length >= CODEX_SESSIONS_READ) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory() && depth < 3) await walk(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(full);
    }
  };
  await walk(root, 0);
  const folders = new Set();
  for (const file of files) {
    // The first line may be longer than what is read: then the `cwd` is taken from the text itself.
    const said = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(await firstLine(file));
    try { const cwd = said ? JSON.parse(`"${said[1]}"`) : null; if (cwd) folders.add(cwd); } catch { /* not a session */ }
  }
  return [...folders];
}
async function firstLine(file) {
  const handle = await open(file, 'r').catch(() => null);
  if (!handle) return '';
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(16384), 0, 16384, 0);
    return buffer.subarray(0, bytesRead).toString('utf8').split('\n')[0];
  } finally { await handle.close(); }
}

// Associates one folder with the lobby: a project inside the home, not the home itself and not
// MADRE's own state. Its record says where it is; a record already there keeps when it was last
// opened. Answers the room's id.
export async function associateProject({ root, home, stateRoot, now = new Date() }) {
  const folder = realFolder(String(root ?? ''));
  const top = realFolder(home);
  if (!root || !inside(folder, top) || sameFolder(folder, top)) return { error: 'outside' };
  if (inside(folder, realFolder(stateRoot))) return { error: 'madre' };
  const info = await stat(folder).catch(() => null);
  if (!info?.isDirectory()) return { error: 'missing' };
  const id = projectRoomId(folder);
  const roomDir = join(stateRoot, 'rooms', id);
  await mkdir(roomDir, { recursive: true });
  const file = join(roomDir, 'project.json');
  const before = await oneAtATime(file, async () => {
    const was = await readJson(file);
    await writeWhole(file, `${JSON.stringify({ ...(was ?? {}), root: folder, name: basename(folder), lastOpened: was?.lastOpened ?? null, added: was?.added ?? now.toISOString() })}\n`);
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
// Where a new project goes when nobody chose (QA 1.1.0, NUE-09): the folder this person already
// keeps projects in, when there is one, rather than the top of their home folder.
const NEW_PROJECT_HOMES = ['Proyectos', 'Projects', 'proyectos', 'projects', 'Developer', 'Code', 'code', 'dev', 'src'];
export async function defaultProjectsFolder(home) {
  for (const name of NEW_PROJECT_HOMES) {
    const found = await stat(join(home, name)).catch(() => null);
    if (found?.isDirectory()) return join(home, name);
  }
  return home;
}

export async function createProject({ name, parent = null, home, stateRoot, now = new Date() }) {
  const problem = projectNameProblem(name);
  if (problem) return { error: problem };
  const top = realFolder(home);
  const place = realFolder(parent || await defaultProjectsFolder(home));
  if (!inside(place, top)) return { error: 'outside' };
  if (inside(place, realFolder(stateRoot))) return { error: 'madre' };
  if (!(await stat(place).catch(() => null))?.isDirectory()) return { error: 'missing' };
  const folder = join(place, String(name));
  if (dirname(folder) !== place) return { error: 'name' };
  try { await mkdir(folder); } catch (error) { return { error: error?.code === 'EEXIST' ? 'exists' : 'missing' }; }
  return { ...(await associateProject({ root: folder, home, stateRoot, now })), created: true };
}

// A project to try MADRE with (2026-11-01): 90 of 147 copies never opened a project, and «I read it
// all and do not know what I would do with MADRE» was said on Facebook. One page, a list of tasks,
// small enough to read and safe to break, and a README with what to ask the agents about it. Made
// in the projects folder under a name that is free, in the person's language.
const SAMPLE = {
  es: {
    names: ['mi-primer-proyecto'],
    readme: `# Mi primer proyecto

Una lista de tareas en una sola página, \`index.html\`, para probar MADRE sin miedo a romper nada. Ábrela con doble clic para verla en tu navegador.

## Cosas para pedirle a tus IAs

- Explícame este proyecto.
- Agrega un botón para borrar las tareas terminadas.
- Haz que las tareas se guarden aunque cierre la página.
- Revisa el código y dime qué mejorarías primero.
- Pídele a una IA que lo cambie y a otra que revise lo que hizo.

Si algo sale mal, DESHACER en MADRE lo regresa a como estaba.
`,
    title: 'Mis tareas', placeholder: 'Escribe una tarea', add: 'Agregar', empty: 'Nada pendiente.',
  },
  en: {
    names: ['my-first-project'],
    readme: `# My first project

A to-do list on a single page, \`index.html\`, to try MADRE without fear of breaking anything. Double-click it to see it in your browser.

## Things to ask your AIs

- Explain this project to me.
- Add a button that clears the finished tasks.
- Make the tasks stay when I close the page.
- Read the code and tell me what you would improve first.
- Ask one AI to change it and another to review what it did.

If something goes wrong, UNDO in MADRE puts it back as it was.
`,
    title: 'My tasks', placeholder: 'Write a task', add: 'Add', empty: 'Nothing pending.',
  },
};
const samplePage = (words, lang) => `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${words.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #222; }
    form { display: flex; gap: .5rem; }
    input[type=text] { flex: 1; padding: .5rem; }
    li { list-style: none; padding: .35rem 0; }
    .done span { text-decoration: line-through; color: #888; }
  </style>
</head>
<body>
  <h1>${words.title}</h1>
  <form id="new">
    <input id="text" type="text" placeholder="${words.placeholder}" autocomplete="off">
    <button>${words.add}</button>
  </form>
  <p id="empty">${words.empty}</p>
  <ul id="list"></ul>
  <script>
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    document.getElementById('new').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('text');
      const text = input.value.trim();
      if (!text) return;
      const item = document.createElement('li');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.addEventListener('change', () => item.classList.toggle('done', box.checked));
      const words = document.createElement('span');
      words.textContent = ' ' + text;
      item.append(box, words);
      list.append(item);
      empty.hidden = true;
      input.value = '';
    });
  </script>
</body>
</html>
`;
export async function createSampleProject({ home, stateRoot, language = 'es', now = new Date() }) {
  const lang = SAMPLE[language] ? language : 'en';
  const words = SAMPLE[lang];
  for (let n = 1; n <= 9; n += 1) {
    const name = n === 1 ? words.names[0] : `${words.names[0]}-${n}`;
    const made = await createProject({ name, home, stateRoot, now });
    if (made.error === 'exists') continue;
    if (made.error) return made;
    await writeFile(join(made.root, 'README.md'), words.readme);
    await writeFile(join(made.root, 'index.html'), samplePage(words, lang));
    return { ...made, sample: true };
  }
  return { error: 'exists' };
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

// A name of the person's own for a project (2026-11-13, the author: «rename it from Home»). Only
// what MADRE shows changes: the folder keeps its name and its place, so nothing that points at it
// breaks. An empty name takes the folder's back.
export const PROJECT_TITLE_MAX = 80;
export async function renameProject({ stateRoot, id, title }) {
  if (typeof id !== 'string' || !/^[^/\\]+$/.test(id) || id === '.' || id === '..') return { error: 'unknown' };
  const file = join(stateRoot, 'rooms', id, 'project.json');
  const said = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, PROJECT_TITLE_MAX);
  return oneAtATime(file, async () => {
    const was = await readJson(file);
    if (!was) return { error: 'unknown' };
    const { title: _old, ...rest } = was;
    await writeWhole(file, `${JSON.stringify(said ? { ...rest, title: said } : rest)}\n`);
    return { id, name: said || (typeof was.name === 'string' ? was.name : id), title: said || null };
  });
}
// The name MADRE shows for a project: the person's own, else its folder's.
export async function projectTitle(roomDir) {
  const record = await readJson(join(roomDir, 'project.json'));
  return typeof record?.title === 'string' && record.title.trim() ? record.title : null;
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
      name: typeof where?.title === 'string' && where.title.trim() ? where.title : typeof where?.name === 'string' ? where.name : typeof mark?.project === 'string' ? mark.project : id.replace(/-[0-9a-f]{16}$/, ''),
      folderName: typeof where?.name === 'string' ? where.name : null,
      root: there ? root : null,
      lastOpened: where?.lastOpened ?? mark?.at ?? null,
      keepOpen: where?.keepOpen === true,
      open,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Opens a room for a project, as `madre start --project <root> --no-open` would. What it says on
// the way up lands in start.log beside its record: if it never comes up, that file says why.
// An update bringing the rest of MADRE along (L-13) opens each on the port it had, and Home too
// (`home`, as `madre lobby` does); a port that got taken meanwhile is an error, not another number.
export function startRoom({ projectRoot, roomDir, env = process.env, spawnImpl = spawn, bin = MADRE_BIN, port = null, home = false }) {
  let log = 'ignore';
  try { log = openPrivateLog(join(roomDir, 'start.log')); } catch { /* no witness, still start */ }
  // The new room is its own: what this room set for itself on the way up is not handed on.
  const own = { ...env };
  for (const name of ['PULSE_UPDATE_RESTART', 'PULSE_OUTBOUND_LOG']) delete own[name];
  try {
    const what = home ? ['lobby'] : ['start', '--project', projectRoot];
    const where = Number.isInteger(port) && port > 0 && port < 65536 ? ['--port', String(port)] : [];
    const child = spawnImpl(process.execPath, [bin, ...what, ...where, '--no-open'], {
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
const wordCount = (text) => (typeof text === 'string' ? (text.match(/\S+/g) ?? []).length : 0);
export function universeOf(research, { full = false } = {}) {
  const memories = (research?.memories ?? []).map((memory) => ({
    id: memory.id,
    kind: memory.kind,
    zone: memory.zone ?? 'hold',
    fromSequence: memory.fromSequence ?? 0,
    throughSequence: memory.throughSequence ?? 0,
    sourcesCount: Array.isArray(memory.sources) ? memory.sources.length : 0,
    // How much it holds, as a count: its size on the map (2026-10-28). The words stay in their room.
    words: wordCount(memory.text),
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
// answers 404 to the routes it does not have yet, and is said to be outdated (S-005). It goes with
// the ficha of this computer (src/ficha.mjs), as the page's own requests do.
export async function askRoom(port, path, { method = 'GET', body = null, fetchImpl = globalThis.fetch, timeoutMs = 1500, stateRoot = defaultStateRoot() } = {}) {
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { ...(await fichaHeaders(stateRoot)), ...(body ? { 'content-type': 'application/json' } : {}) },
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
