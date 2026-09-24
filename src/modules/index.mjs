// The registry. Order is the order MODULES shows. MADRE's own modules first; then the
// human's, loaded from ~/.pulse/modules/*.mjs (every project) and <project>/.madre/modules/*.mjs
// (this project). An external module is a file whose default export is a plain spec object
// (defineModule is applied here), a module already built with defineModule, or a function
// receiving { defineModule } and returning either. Agents cannot write those folders: .madre/
// is a forbidden zone, and ~/.pulse lives outside every project.
import { readdir, readFile, writeFile, mkdir, unlink, mkdtemp, rm, access } from 'node:fs/promises';
import { join, basename, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ahp from './ahp.mjs';
import imageStudio from './image-studio.mjs';
import gitPulse from './git-pulse.mjs';
import ash from './ash.mjs';
import ripley from './ripley.mjs';
import ollama from './ollama.mjs';
import playwright from './playwright.mjs';
import { defineModule, matchRoute } from './sdk.mjs';

export const MODULES = [ahp, imageStudio, gitPulse, ash, ripley, ollama, playwright];
export const BUILTIN_IDS = new Set(MODULES.map((module) => module.id));
export const loadFailures = [];   // { file, error } for MODULES to show
export const moduleFolders = ({ stateRoot, projectRoot }) => ({ user: join(stateRoot, 'modules'), project: join(projectRoot, '.madre', 'modules') });
// Where the SDK guide and the example live in this installation, for agents who build modules.
export const sdkPaths = () => ({ guide: fileURLToPath(new URL('../../docs/SDK.md', import.meta.url)), example: fileURLToPath(new URL('../../docs/sdk/hello-module.mjs', import.meta.url)) });
// A file an agent wrote that means "install me as a module": <id>.module.mjs.
export const isModuleFile = (path) => /\.module\.mjs$/.test(String(path ?? ''));

// The rules an outside module must keep so it cannot reach MADRE's core: its own id, and its
// routes under /api/x/<id>/ only, never MADRE's own paths.
function checkExternal(module, { replace = false } = {}) {
  const taken = MODULES.find((known) => known.id === module.id);
  // A module that ships with MADRE can never be shadowed. One of the human's own can be
  // replaced, because that is what installing a newer copy of it is.
  if (taken && (!replace || !taken.external)) throw new Error(`the id "${module.id}" is already taken`);
  for (const route of module.routes ?? []) {
    const path = typeof route.path === 'string' ? route.path : route.path?.source ?? '';
    if (!path.startsWith(`/api/x/${module.id}/`) && !path.startsWith(`\\/api\\/x\\/${module.id}\\/`)) throw new Error(`route ${path} must live under /api/x/${module.id}/`);
  }
  return module;
}

// Loads one file as a module, throwing a readable error when it is not one.
async function importModuleFile(file) {
  const loaded = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  let spec = loaded.default ?? loaded.module ?? null;
  if (typeof spec === 'function') spec = await spec({ defineModule });
  if (!spec || typeof spec !== 'object') throw new Error('the default export must be a module spec object');
  return typeof spec.describe === 'function' ? spec : defineModule(spec);
}

export async function loadExternalModules({ stateRoot, projectRoot }) {
  for (let index = MODULES.length - 1; index >= 0; index -= 1) if (MODULES[index].external) MODULES.splice(index, 1);
  loadFailures.length = 0;
  const folders = moduleFolders({ stateRoot, projectRoot });
  for (const [origin, dir] of Object.entries(folders)) {
    let files = [];
    try { files = (await readdir(dir)).filter((name) => /\.(mjs|js)$/.test(name) && !name.startsWith('.')).sort(); } catch { continue; }
    for (const name of files) {
      const file = join(dir, name);
      try {
        const module = checkExternal(await importModuleFile(file));
        MODULES.push(Object.freeze({ ...module, external: true, origin, file }));
      } catch (error) {
        loadFailures.push({ file, origin, error: error.message });
      }
    }
  }
  return { loaded: MODULES.filter((module) => module.external), failures: [...loadFailures], folders };
}

// The one door every module comes through, whoever wrote it and wherever the text came from: it
// is written to a scratch copy, imported there and checked against the house rules. A module runs
// inside MADRE with the human's own permissions, so the check is the point. Checking installs
// nothing and touches no registry — asking what a file is must never change what is loaded.
export async function verifyModuleText({ text, name = null, replace = true }) {
  const scratch = await mkdtemp(join(tmpdir(), 'madre-module-check-'));
  try {
    const probe = join(scratch, name && /\.m?js$/.test(name) ? basename(name) : 'candidate.mjs');
    await writeFile(probe, text);
    const module = checkExternal(await importModuleFile(probe), { replace });
    return { id: module.id, name: module.name, vendor: module.vendor, version: module.version ?? null, summary: module.summary ?? '', updates: module.updates ?? null };
  } finally { await rm(scratch, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
}

export async function installModuleText({ text, name = null, scope = 'user', stateRoot, projectRoot, source = null, replace = true }) {
  const module = await verifyModuleText({ text, name, replace });
  const replaced = Boolean(MODULES.find((known) => known.id === module.id)?.external);
  const folders = moduleFolders({ stateRoot, projectRoot });
  const dir = folders[scope === 'project' ? 'project' : 'user'];
  await mkdir(dir, { recursive: true });
  const target = join(dir, `${module.id}.mjs`);
  await writeFile(target, text);
  // Where it came from, so the same place can be asked for a newer one later.
  if (source) await writeFile(join(dir, `${module.id}.source.json`), JSON.stringify({ ...source, at: new Date().toISOString(), version: module.version ?? null }, null, 2)).catch(() => {});
  await loadExternalModules({ stateRoot, projectRoot });
  return { id: module.id, name: module.name, version: module.version ?? null, file: target, origin: scope === 'project' ? 'project' : 'user', replaced };
}

// The same thing from a file already on this computer. `source` must be inside the project or the
// room folder; agents never reach the module folders themselves.
export async function installModuleFile({ source, scope = 'user', stateRoot, projectRoot, roomDir = null }) {
  const canonical = resolve(source);
  const allowed = [resolve(projectRoot), ...(roomDir ? [resolve(roomDir)] : [])];
  if (!allowed.some((root) => canonical === root || canonical.startsWith(root + sep))) throw new Error('A module can only be installed from a file inside the project or the room folder.');
  const text = await readFile(canonical, 'utf8');
  return installModuleText({ text, name: basename(canonical), scope, stateRoot, projectRoot, source: { kind: 'file', from: canonical } });
}

// Where a module was installed from, if MADRE was told. This is what "update this module" asks
// again: the file the author keeps it in, or the address they publish it at.
export async function moduleOrigin(module) {
  if (!module?.external || !module.file) return null;
  const declared = module.updates?.url ? { kind: 'url', from: module.updates.url } : null;
  const remembered = await readFile(module.file.replace(/\.mjs$/, '.source.json'), 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
  return declared ?? (remembered?.from ? { kind: remembered.kind ?? 'file', from: remembered.from, at: remembered.at ?? null } : null);
}

// Removing is for the human's modules only; MADRE's own stay.
export async function removeExternalModule({ id, stateRoot, projectRoot }) {
  const module = MODULES.find((known) => known.id === id);
  if (!module) throw new Error(`No module "${id}".`);
  if (!module.external) throw new Error(`${module.name} ships with MADRE and cannot be removed; switch it off instead.`);
  await unlink(module.file).catch(() => {});
  await loadExternalModules({ stateRoot, projectRoot });
  return { id, name: module.name, file: module.file };
}

export const moduleById = (id) => MODULES.find((module) => module.id === id) ?? null;
// What MODULES shows, with each card's update state attached from the cache when the room offers
// the service. Never a network read: a screen that waits on a registry is a screen that hangs.
export async function describeModules(ctx) {
  const items = await Promise.all(MODULES.map((module) => module.describe(ctx)));
  const look = ctx.services?.moduleUpdate;
  if (!look) return items;
  return Promise.all(items.map(async (item) => ({ ...item, update: await look(item).catch(() => null) })));
}
// One flat list of every route a module serves, with the module attached.
export function findModuleRoute(method, pathname) {
  for (const module of MODULES) {
    const hit = matchRoute(module.routes, method, pathname);
    if (hit) return { module, ...hit };
  }
  return null;
}
// Every slash command the modules declare, with its module attached.
export function moduleCommands() {
  return MODULES.flatMap((module) => (module.slash ?? []).map((command) => ({ ...command, module })));
}
// Every tool server the modules hand to one turn, flattened; a module that fails hands nothing.
export async function toolsForTurn(ctx, turn) {
  const lists = await Promise.all(MODULES.filter((module) => module.toolsForTurn).map((module) => module.toolsForTurn(ctx, turn)));
  return lists.flat().filter((server) => server && server.name && server.command);
}
export { defineModule } from './sdk.mjs';
