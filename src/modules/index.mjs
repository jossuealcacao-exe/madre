// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The registry. Order is the order MODULES shows. MADRE's own modules first; then the
// human's, loaded from ~/.pulse/modules/*.mjs (every project) and <project>/.madre/modules/*.mjs
// (this project). An external module is a file whose default export is a plain spec object
// (defineModule is applied here), a module already built with defineModule, or a function
// receiving { defineModule } and returning either. Agents cannot write those folders: .madre/
// is a forbidden zone, and ~/.pulse lives outside every project.
import { readdir, readFile, writeFile, mkdir, unlink, mkdtemp, rm } from 'node:fs/promises';
import { translate } from '../i18n.mjs';
import { join, basename, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { clearDeclaredDestinations, declareDestinations } from '../outbound.mjs';
import ahp from './ahp.mjs';
import imageStudio from './image-studio.mjs';
import gitPulse from './git-pulse.mjs';
import ash from './ash.mjs';
import intents from './intents.mjs';
import choices from './choices.mjs';
import notes from './notes.mjs';
import reminders from './reminders.mjs';
import runs from './runs.mjs';
import ripley from './ripley.mjs';
import ollama from './ollama.mjs';
import playwright from './playwright.mjs';
import correo from './correo.mjs';
import github from './github.mjs';
import enlaces from './enlaces.mjs';
import bishop from './bishop.mjs';
import mcpConnect from './mcp-connect.mjs';
import { isSalasRoom } from '../salas.mjs';
import { defineModule, matchRoute, understandsSdk } from './sdk.mjs';
import { builtinFile, newer, readBuiltinRecord, trustedBytes } from '../builtin-updates.mjs';

// The lab: modules that are built and tested but not offered yet, because they are not finished
// to the standard of the rest. They stay out of MODULES and out of every prompt unless someone
// asks for them by name in PULSE_LABS (a comma-separated list of ids). Their ids stay reserved,
// so a module of somebody's own cannot take one and collide with it the day it comes out.
export const LAB_MODULES = [correo];
const labsAsked = new Set(String(process.env.PULSE_LABS ?? '').split(',').map((id) => id.trim()).filter(Boolean));
// A module of MADRE's own may be one file that imports nothing (SDK 2): it exports its plain spec,
// and the SDK is applied here, as it is to a module of anyone else's.
const own = (spec) => (typeof spec?.describe === 'function' ? spec : defineModule(spec));
export const MODULES = [ahp, imageStudio, gitPulse, ash, intents, choices, own(notes), own(reminders), runs, ripley, ollama, playwright, github, enlaces, bishop, mcpConnect, ...LAB_MODULES.filter((module) => labsAsked.has(module.id))];
export const BUILTIN_IDS = new Set([...MODULES, ...LAB_MODULES].map((module) => module.id));
// MADRE's own modules as they came in the package, by id: what a newer file from the Market stands
// in for, and what comes back when that file fails, is taken back or is turned off.
const PACKAGED = new Map([...MODULES, ...LAB_MODULES].map((module) => [module.id, module]));
export const packagedVersions = () => Object.fromEntries([...PACKAGED].map(([id, module]) => [id, module.version ?? '0.0.0']));
export const loadFailures = [];   // { file, error } for MODULES to show
export const moduleFolders = ({ stateRoot, projectRoot }) => ({ user: join(stateRoot, 'modules'), project: join(projectRoot, '.madre', 'modules') });
// Where the SDK guide and the example live in this installation, for agents who build modules.
// What an agent writing a module is pointed at. Two examples and not one, because the connector
// shape — one file that is both the module and the MCP server it spawns — is not something a
// model derives from the guide: it writes two files, or it writes the self-detection wrong and
// the server answers nothing.
export const sdkPaths = () => ({
  guide: fileURLToPath(new URL('../../docs/SDK.md', import.meta.url)),
  example: fileURLToPath(new URL('../../docs/sdk/hello-module.mjs', import.meta.url)),
  connector: fileURLToPath(new URL('../../docs/sdk/connector-module.mjs', import.meta.url)),
});
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
  // Rebuilt from what is loaded, never added to: uninstalling a connector has to take its
  // declared destination with it, or the log would keep vouching for an address nothing reaches.
  clearDeclaredDestinations();
  for (const module of MODULES) if (module.reaches) declareDestinations(module.id, module.reaches);
  const folders = moduleFolders({ stateRoot, projectRoot });
  for (const [origin, dir] of Object.entries(folders)) {
    let files = [];
    try { files = (await readdir(dir)).filter((name) => /\.(mjs|js)$/.test(name) && !name.startsWith('.')).sort(); } catch { continue; }
    for (const name of files) {
      const file = join(dir, name);
      try {
        const module = checkExternal(await importModuleFile(file));
        MODULES.push(Object.freeze({ ...module, external: true, origin, file }));
        if (module.reaches) declareDestinations(module.id, module.reaches);
      } catch (error) {
        loadFailures.push({ file, origin, error: error.message });
      }
    }
  }
  return { loaded: MODULES.filter((module) => module.external), failures: [...loadFailures], folders };
}

// MADRE's OWN MODULES, NEWER FROM THE MARKET (src/builtin-updates.mjs). Each newer file kept on this
// computer is checked again here — its bytes against the sha256 and the factory signature it came
// with, its id, its contract, its version — and stands in for the one in the package. It keeps
// what MADRE's own have (its own routes, its card) and is never «yours»: it cannot be removed, only
// sent back. One that fails leaves the package's in place, and why is kept in builtinFailures.
// `enabled: false` (Look for new versions off) sends every one back to the package's.
// Why a newer file was not run, for Diagnostics and the log. Not among «your modules that did not
// load»: the module works, as the one MADRE came with, and it is not the person's to fix.
export const builtinFailures = [];
export async function adoptBuiltinUpdates({ stateRoot, enabled = true, factoryKey } = {}) {
  const adopted = [];
  builtinFailures.length = 0;
  const record = enabled && stateRoot ? await readBuiltinRecord(stateRoot) : {};
  for (const [id, packaged] of PACKAGED) {
    const index = MODULES.findIndex((module) => module.id === id);
    const kept = record[id];
    let module = packaged;
    if (kept && newer(kept.version, packaged.version ?? '0.0.0')) {
      const file = builtinFile(stateRoot, id);
      try {
        const bytes = await readFile(file);
        if (!trustedBytes(bytes, kept, ...(factoryKey ? [factoryKey] : []))) throw new Error('the file is not the one the factory key signed');
        const loaded = await import(`${pathToFileURL(file).href}?sha=${kept.sha256}`);
        const spec = loaded.default ?? null;
        if (!spec || typeof spec !== 'object') throw new Error('the default export must be a module spec object');
        const fresh = typeof spec.describe === 'function' ? spec : defineModule(spec);
        if (fresh.id !== id) throw new Error(`the file says it is "${fresh.id}"`);
        if (!understandsSdk(fresh.sdk)) throw new Error(`it needs contract ${fresh.sdk} of the SDK`);
        if (fresh.version !== kept.version) throw new Error(`it says ${fresh.version}, the catalog said ${kept.version}`);
        module = Object.freeze({ ...fresh, updated: { from: packaged.version ?? null, to: fresh.version }, file });
        adopted.push({ id, from: packaged.version ?? null, to: fresh.version });
      } catch (error) {
        builtinFailures.push({ id, file, version: kept.version, error: error.message });
        console.error(`MADRE modules: ${packaged.name} ${kept.version} from the Market did not load (${error.message}); MADRE uses the one it came with.`);
      }
    }
    if (index >= 0 && MODULES[index] !== module) MODULES[index] = module;
  }
  return adopted;
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
    let module;
    try {
      module = checkExternal(await importModuleFile(probe), { replace });
    } catch (error) {
      // The one mistake that looks right and never works: MADRE's own modules import the SDK by
      // relative path because they live inside the package, and anyone — an agent most of all —
      // reading one of them copies that line. Here the file is alone in a scratch folder, so the
      // import cannot resolve and node says only that it cannot find a file. Say what to do.
      if (error?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find (module|package)/.test(error?.message ?? '')) {
        throw new Error(`${error.message.split('\n')[0]} — a module imports nothing: MADRE loads it from a folder of its own to check it, where no package resolves. Export a plain object, or a function ({ defineModule }) => defineModule({ … }) and MADRE hands you the SDK.`);
      }
      throw error;
    }
    return { id: module.id, name: module.name, vendor: module.vendor, version: module.version ?? null, summary: module.summary ?? '', updates: module.updates ?? null, unknown: module.unknown ?? [], declares: declaredBy(module) };
  } finally { await rm(scratch, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
}

// WHAT A MODULE SAYS IT DOES, read from what it declares, for the person to read before it is
// installed (2026-10-25). Only what the file itself declares: where it reaches, the keys it asks
// for, whether it hands tools to the agents or reads the conversations, the pages and commands it
// adds, and whether it writes in the project. What the code does beyond that nobody can promise —
// which is why the page also says, every time, that a module runs with the person's permissions.
export function declaredBy(module) {
  return {
    reaches: (module.reaches ?? []).map(({ host, to, what, when }) => ({ host: host ?? null, to: to ?? null, what: what ?? null, when: when ?? null })),
    secrets: (module.secrets ?? []).map(({ name, label }) => ({ name, label: label ?? name })),
    tools: typeof module.toolsForTurn === 'function',
    reads: typeof module.onEvent === 'function',
    pages: (module.routes ?? []).length,
    commands: (module.slash ?? []).map((command) => command.usage ?? `/${command.name}`),
    writes: module.kind === 'installer',
    creates: module.creates ?? [],
  };
}

// The same door for a newer file of one of MADRE's own modules, before it is signed and published
// (scripts/market-publish.mjs): alone in a scratch folder, where nothing of MADRE resolves, it must
// load, say it is that module, speak a contract this MADRE knows and be newer than the package's.
export async function verifyBuiltinText({ text, id }) {
  const packaged = PACKAGED.get(id);
  if (!packaged) throw new Error(`"${id}" is not one of MADRE's own modules.`);
  const scratch = await mkdtemp(join(tmpdir(), 'madre-builtin-check-'));
  try {
    const probe = join(scratch, `${id}.mjs`);
    await writeFile(probe, text);
    const module = await importModuleFile(probe);
    if (module.id !== id) throw new Error(`The file says it is "${module.id}", not "${id}".`);
    if (!understandsSdk(module.sdk)) throw new Error(`${id} needs contract ${module.sdk} of the SDK.`);
    if (!module.version || !newer(module.version, packaged.version ?? '0.0.0')) throw new Error(`${id} ${module.version ?? '(no version)'} is not newer than the ${packaged.version} MADRE comes with.`);
    return { id: module.id, version: module.version, sdk: module.sdk };
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
  return { id: module.id, name: module.name, version: module.version ?? null, file: target, origin: scope === 'project' ? 'project' : 'user', replaced, unknown: module.unknown ?? [] };
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
  // The origin record goes first: if it cannot be removed, the executable module file remains
  // installed rather than leaving a live registry entry whose file has already disappeared.
  const files = [...new Set([module.file.replace(/\.(?:mjs|js)$/, '.source.json'), module.file])];
  const removedFiles = [];
  for (const file of files) {
    try { await unlink(file); removedFiles.push(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await loadExternalModules({ stateRoot, projectRoot });
  return { id, name: module.name, file: module.file, removedFiles };
}

export const moduleById = (id) => MODULES.find((module) => module.id === id) ?? null;
// What MODULES shows, with each card's update state attached from the cache when the room offers
// the service. Never a network read: a screen that waits on a registry is a screen that hangs.
export async function describeModules(ctx) {
  const visible = MODULES.filter((module) => module.id !== 'bishop' || (ctx.projectRoot && ctx.stateRoot && isSalasRoom(ctx.projectRoot, ctx.stateRoot)));
  const items = await Promise.all(visible.map((module) => module.describe(ctx)));
  const look = ctx.services?.moduleUpdate;
  // One place, at the boundary: what a module says about itself is written in English inside the
  // module, and it is the card that speaks the room's language. Nothing in the module files
  // changes, and neither does what a module hands to an agent.
  if (!look) return translate(items);
  return translate(await Promise.all(items.map(async (item) => ({ ...item, update: await look(item).catch(() => null) }))));
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
// Tools a module hands to this turn — and the one thing the core takes back.
//
// A tool that SENDS is not a tool that reads. Reading something unhelpful is a wasted turn;
// mailing it is not, and what goes out carries the human's name. MADRE already has a rung that
// means exactly «this may leave the machine» — #4 AIRLOCK, where the rule is to say in one line
// what goes out and where before doing it — so a sending tool lives there and nowhere below.
//
// Enforced here rather than left to each module. A connector declares which of its tools send
// (`sends: ['send_email']`); under #4 they are handed over, and below it they are removed from
// the list the agent is given, so the model is never told about a tool it may not use. A module
// that forgets to declare, or declares wrongly, cannot widen its own permission by doing so: a
// server whose every tool sends is dropped whole.
export async function toolsForTurn(ctx, turn) {
  // Each module on its own (LOG-17 of the 1.0 review): one that threw took every module's tools
  // out of the turn with it, Playwright and GitHub and the links included.
  const offering = MODULES.filter((module) => module.toolsForTurn);
  const settled = await Promise.allSettled(offering.map(async (module) => module.toolsForTurn(ctx, turn)));
  const lists = settled.map((outcome, index) => {
    if (outcome.status === 'fulfilled') return outcome.value ?? [];
    console.error(`MADRE module ${offering[index].id ?? '?'} handed no tools: ${outcome.reason?.message ?? outcome.reason}`);
    return [];
  });
  const airlock = Number(turn?.mode) === 4;
  const servers = [];
  for (const server of lists.flat()) {
    if (!server || !server.name || !server.command) continue;
    const sends = Array.isArray(server.sends) ? server.sends : [];
    if (!sends.length || airlock) { servers.push(server); continue; }
    const left = Array.isArray(server.tools) ? server.tools.filter((tool) => !sends.includes(tool)) : [];
    if (!left.length) continue;                 // nothing of it is readable: it does not travel
    servers.push({ ...server, tools: left, brief: `${server.brief ?? ''}${server.brief ? ' ' : ''}Sending is switched off for this turn: it needs #4 AIRLOCK.`.trim() });
  }
  return servers;
}
export { defineModule } from './sdk.mjs';
