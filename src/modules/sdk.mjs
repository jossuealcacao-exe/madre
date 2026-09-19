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

const camel = (id) => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export function defineModule(spec) {
  if (!spec?.id || !/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error(`Module id must be kebab-case: ${spec?.id}`);
  if (!spec.name) throw new Error(`Module ${spec.id} needs a name.`);
  const kind = spec.kind ?? 'builtin';
  const configKey = spec.configKey ?? camel(spec.id);
  const defaults = { ...(kind === 'builtin' ? { enabled: false } : {}), ...(spec.settings ?? {}) };
  const base = {
    id: spec.id, kind, name: spec.name, vendor: spec.vendor ?? 'MADRE', package: spec.package ?? null, version: spec.version ?? '0.1.0',
    summary: spec.summary ?? '', creates: spec.creates ?? [], requires: spec.requires ?? [], models: spec.models ?? [], commands: spec.commands,
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
      return {
        ...base,
        ...own,
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
