// The registry. Order is the order MODULES shows.
import ahp from './ahp.mjs';
import imageStudio from './image-studio.mjs';
import gitPulse from './git-pulse.mjs';
import ashcode from './ashcode.mjs';
import ripley from './ripley.mjs';
import ollama from './ollama.mjs';
import { matchRoute } from './sdk.mjs';

export const MODULES = [ahp, imageStudio, gitPulse, ashcode, ripley, ollama];
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
export { defineModule } from './sdk.mjs';
