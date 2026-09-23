// MADRE's module SDK. A module is one file: what it is, the settings it keeps
// in ~/.pulse/config.json, how it describes itself to MODULES, what its switch
// does, the routes it serves and the events it listens to. The server builds a
// context (ctx) per call and hands it in; the module never reaches for globals.
//
//   ctx = { projectRoot, stateRoot, config, settings, env, agents, room, readConfig(), updateConfig(patch),
//           record(type, payload), services: { ... what the server offers } }
//
// A module may also hand tools to every turn: `toolsForTurn(ctx, turn)` returns MCP server
// specs `{ name, command, args, env, tools: [names], brief }` that MADRE attaches to the CLI for
// that turn only, in its isolated run, and describes to the agent. `turn` carries the agent,
// the mode, the lease (if any), the absolute scratch folder and the room's port.
//
// Kinds: 'builtin' switches MADRE's own behaviour (config.json only);
// 'installer' writes into the project through a confirmed command.

import { readFile, stat } from 'node:fs/promises';

const camel = (id) => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

let release = null;
// MADRE's own release, read once from the package that is running.
export async function madreRelease() {
  if (release) return release;
  const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8').catch(() => '');
  try { release = JSON.parse(raw).version ?? '0.0.0'; } catch { release = '0.0.0'; }
  return release;
}

// What version a card shows. A module that is a wrapper around something else — a browser server,
// a local model runner, a CLI — has no version worth showing of its own: what matters is the
// version of the thing it drives, found on this computer, and `null` means it is not there. Every
// other module declares its own, starting at 1.0.0. A module someone else wrote and left
// unversioned falls back to the day its file was written, which is the only truth on disk.
export async function versionOf(module, { declared = null, tracked } = {}) {
  if (tracked !== undefined) return { version: tracked, source: 'tracked' };
  if (declared) return { version: declared, source: 'declared' };
  if (module?.external) {
    const when = await stat(module.file).then((info) => info.mtime).catch(() => null);
    return when ? { version: when.toISOString().slice(0, 10), source: 'file' } : { version: null, source: 'none' };
  }
  return { version: '1.0.0', source: 'declared' };
}

// What a module drives that is not MADRE and not the module itself: an npm package, a server, a
// binary on this computer. `version` is what was found here and now, `null` when it is not
// installed at all; `target` is what the module would install if asked. The card shows each one
// as its own tag, so a version on screen always belongs to something nameable.
export function dependencies(runs) {
  const list = Array.isArray(runs) ? runs : runs ? [runs] : [];
  return list.filter((dep) => dep && dep.name).map((dep) => ({ name: String(dep.name), version: dep.version ?? null, target: dep.target ?? null }));
}

export function defineModule(spec) {
  if (!spec?.id || !/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error(`Module id must be kebab-case: ${spec?.id}`);
  if (!spec.name) throw new Error(`Module ${spec.id} needs a name.`);
  const kind = spec.kind ?? 'builtin';
  const configKey = spec.configKey ?? camel(spec.id);
  const defaults = { ...(kind === 'builtin' ? { enabled: false } : {}), ...(spec.settings ?? {}) };
  const base = {
    id: spec.id, kind, name: spec.name, vendor: spec.vendor ?? 'MADRE', package: spec.package ?? null, version: spec.version ?? null,
    // What this module's version follows, when it is not its own: { name, npm } or { name, github }.
    // MADRE reads the version from there and looks for a newer one on its own, once a day.
    tracks: spec.tracks ? { name: spec.tracks.name ?? spec.tracks.npm ?? spec.tracks.github ?? null, npm: spec.tracks.npm ?? null, github: spec.tracks.github ?? null } : null,
    summary: spec.summary ?? '', creates: spec.creates ?? [], requires: spec.requires ?? [], models: spec.models ?? [], commands: spec.commands ?? (spec.slash?.length ? spec.slash.map((command) => command.usage ?? `/${command.name}`) : undefined),
    card: spec.card ?? (kind === 'builtin' ? 'switch' : 'installer'),
  };
  const settingsFrom = (config) => ({ ...defaults, ...(config?.modules?.[configKey] ?? {}) });
  const module = {
    ...base,
    configKey,
    defaults,
    settingsFrom,
    routes: (spec.routes ?? []).map((route) => ({ ...route, method: route.method.toUpperCase() })),
    onEvent: spec.onEvent ?? null,
    conditions: spec.conditions ?? [],
    // Slash commands the human types in the composer; they run on the server with the module's
    // ctx and settings and land in the room as a fact card everyone reads. Only while the module is on.
    slash: (spec.slash ?? []).map((command) => {
      if (!command?.name || !/^[a-z][a-z0-9-]*$/.test(command.name)) throw new Error(`Module ${spec.id}: a slash command needs a kebab-case name.`);
      if (typeof command.execute !== 'function') throw new Error(`Module ${spec.id}: /${command.name} needs an execute(ctx, args) function.`);
      return { name: command.name, usage: command.usage ?? `/${command.name}`, summary: command.summary ?? '', title: command.title ?? spec.name, available: command.available ?? null, execute: command.execute };
    }),
    // Tools for a turn, only while the module is on. Failures never break a turn.
    toolsForTurn: spec.toolsForTurn ? async (ctx, turn) => {
      const settings = settingsFrom(ctx.config);
      if (kind === 'builtin' && !settings.enabled) return [];
      try { return (await spec.toolsForTurn({ ...ctx, settings }, turn)) ?? []; } catch (error) { console.error(`MADRE module ${spec.id}: toolsForTurn failed: ${error.message}`); return []; }
    } : null,
    // Legacy installer hooks, kept on the object so the confirm-and-run path can use them.
    detect: spec.detect ?? null,
    preflight: spec.preflight ?? null,
    installCommand: spec.installCommand ?? null,

    // What MODULES shows: base fields plus status, preflight, install line and whatever the module adds.
    async describe(ctx) {
      const settings = settingsFrom(ctx.config);
      const own = spec.status ? await spec.status({ ...ctx, settings }) : {};
      const installed = own.installed ?? (kind === 'builtin' ? Boolean(settings.enabled) : false);
      const runs = dependencies(own.runs);
      const tracked = base.tracks ? (runs.find((dep) => dep.name === base.tracks.name)?.version ?? null) : undefined;
      const stamp = await versionOf(this, { declared: spec.version ?? null, tracked });
      return {
        ...base,
        ...(this.external ? { external: true, origin: this.origin, file: this.file } : {}),
        ...own,
        version: stamp.version,
        versionSource: stamp.source,
        ships: this.external ? null : await madreRelease(),
        runs,
        status: own.status ?? { installed, detail: own.detail ?? (installed ? 'on' : 'off') },
        preflight: own.preflight ?? { ok: true, problems: [] },
        install: own.install ?? (kind === 'builtin' ? { display: installed ? `disable ${base.name}` : `enable ${base.name} (config.json)`, platforms: [] } : { display: '', platforms: [] }),
      };
    },

    // The switch. Default for builtins: flip `enabled`, persist, tell the room.
    // A module may guard it (`confirm`) or replace it (`toggle`).
    toggle: kind === 'builtin' || spec.toggle ? async (ctx, payload = {}) => {
      const settings = settingsFrom(ctx.config);
      if (spec.toggle) return spec.toggle({ ...ctx, settings }, payload);
      const enabled = !settings.enabled;
      if (enabled && spec.confirm && payload.confirm !== true) return { status: 400, body: { error: spec.confirm } };
      await ctx.updateConfig({ modules: { ...(ctx.config.modules ?? {}), [configKey]: { ...(ctx.config.modules?.[configKey] ?? {}), enabled } } });
      const after = spec.onToggle ? await spec.onToggle({ ...ctx, settings: { ...settings, enabled } }, enabled) : null;
      await ctx.record('extension.toggled', { id: spec.id, name: base.name, enabled, ...(spec.toggledEvent ?? {}) });
      return { status: 200, body: { enabled, ...(after ?? {}), ...(spec.toggledBody?.(enabled) ?? {}) } };
    } : null,
  };
  return Object.freeze(module);
}

// Matches a request against a module's routes; params come from a RegExp path.
export function matchRoute(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (typeof route.path === 'string') { if (route.path === pathname) return { route, params: [] }; continue; }
    const match = pathname.match(route.path);
    if (match) return { route, params: match.slice(1) };
  }
  return null;
}
