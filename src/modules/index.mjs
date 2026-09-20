// The registry. Order is the order MODULES shows. MADRE's own modules first; then the
// human's, loaded from ~/.pulse/modules/*.mjs (every project) and <project>/.madre/modules/*.mjs
// (this project). An external module is a file whose default export is a plain spec object
// (defineModule is applied here), a module already built with defineModule, or a function
// receiving { defineModule } and returning either. Agents cannot write those folders: .madre/
// is a forbidden zone, and ~/.pulse lives outside every project.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ahp from './ahp.mjs';
import imageStudio from './image-studio.mjs';
import gitPulse from './git-pulse.mjs';
import ashcode from './ashcode.mjs';
import ripley from './ripley.mjs';
import ollama from './ollama.mjs';
import playwright from './playwright.mjs';
import { defineModule, matchRoute } from './sdk.mjs';

export const MODULES = [ahp, imageStudio, gitPulse, ashcode, ripley, ollama, playwright];
export const BUILTIN_IDS = new Set(MODULES.map((module) => module.id));
export const loadFailures = [];   // { file, error } for MODULES to show
export const moduleFolders = ({ stateRoot, projectRoot }) => ({ user: join(stateRoot, 'modules'), project: join(projectRoot, '.madre', 'modules') });

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
        const loaded = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
        let spec = loaded.default ?? loaded.module ?? null;
        if (typeof spec === 'function') spec = await spec({ defineModule });
        if (!spec || typeof spec !== 'object') throw new Error('the default export must be a module spec object');
        const module = typeof spec.describe === 'function' ? spec : defineModule(spec);
        if (MODULES.some((known) => known.id === module.id)) throw new Error(`the id "${module.id}" is already taken`);
        MODULES.push(Object.freeze({ ...module, external: true, origin, file }));
      } catch (error) {
        loadFailures.push({ file, origin, error: error.message });
      }
    }
  }
  return { loaded: MODULES.filter((module) => module.external), failures: [...loadFailures], folders };
}

export const moduleById = (id) => MODULES.find((module) => module.id === id) ?? null;
export function describeModules(ctx) { return Promise.all(MODULES.map((module) => module.describe(ctx))); }
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
