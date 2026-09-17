// What each CLI can do from MADRE, verified against the installed versions on
// 2026-09-16 (Codex 0.153, Claude Code 2.1, Gemini CLI 0.60, OpenCode 1.18).
// The room shows this so a human knows whom to ask for what, and an
// orchestrator can route steps to the agent that actually has the ability.
//
//   read       inspect the project (always on: consultation mode)
//   imageIn    accept an image the human attaches
//   write      create files, only inside a scoped output directory, only when
//              the human grants a creation lease for the turn (phase 2)
//   imageGen   generate images (Codex: image_generation feature via ChatGPT)
//   web        fetch or search the web (denied by default in consultation mode)

export const CAPABILITIES = {
  codex: {
    read: true,
    imageIn: { how: '-i <file>', note: 'Images attach to the prompt directly.' },
    write: { how: '-C <outdir> --sandbox workspace-write', note: 'Reads the whole project, writes only inside the lease directory.' },
    imageGen: { how: 'features.image_generation (stable, enabled)', note: 'Generated with the ChatGPT account; saved into the lease directory.' },
    web: { how: '--search (live web_search tool)', note: 'Off until enabled in CONNECTIONS.' },
  },
  claude: {
    read: true,
    imageIn: { how: 'Read tool on the attachment path', note: 'The attachments folder is added with --add-dir.' },
    write: { how: '--tools Write,Edit + permission rules', note: 'Write/Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: '--tools WebFetch,WebSearch', note: 'Off until enabled in CONNECTIONS.' },
  },
  gemini: {
    read: true,
    imageIn: { how: 'read_file on the attachment path', note: 'The attachments folder is added with --include-directories.' },
    write: { how: 'policy: allow write_file/edit with argsPattern', note: 'Paths outside the lease directory stay denied.' },
    imageGen: false,
    web: { how: 'policy: allow google_web_search, web_fetch', note: 'Off until enabled in CONNECTIONS.' },
  },
  opencode: {
    read: true,
    imageIn: { how: '-f <file>', note: 'Files attach to the message.' },
    write: { how: 'permission.edit patterns', note: 'Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: 'permission.webfetch / websearch = allow', note: 'Off until enabled in CONNECTIONS.' },
  },
};

// MADRE modules can add abilities a CLI lacks. Image Studio (MADRE's own MCP
// image server on the Gemini API) gives Gemini CLI, Claude Code and OpenCode
// image generation; Codex keeps its native one.
let imageModule = { enabled: false };
export function setImageModule(state) {
  imageModule = { enabled: Boolean(state?.enabled), model: state?.model ?? null };
}
export const imageModuleState = () => ({ ...imageModule });

export const capabilityOf = (agentId) => {
  const base = CAPABILITIES[agentId] ?? { read: true, imageIn: false, write: false, imageGen: false, web: false };
  if (!base.imageGen && imageModule.enabled && ['gemini', 'claude', 'opencode'].includes(agentId)) {
    return { ...base, imageGen: { how: 'MADRE Image Studio (MCP tool generate_image, Gemini API)', note: `Attached only inside a creation lease with the image scope on${imageModule.model ? ` · model ${imageModule.model}` : ''}.`, module: 'image-studio' } };
  }
  return base;
};

export function capabilitySummary(agentId) {
  const caps = capabilityOf(agentId);
  return {
    read: Boolean(caps.read),
    imageIn: Boolean(caps.imageIn),
    write: Boolean(caps.write),
    imageGen: Boolean(caps.imageGen),
    web: Boolean(caps.web),
    detail: Object.fromEntries(Object.entries(caps).filter(([, value]) => value && typeof value === 'object').map(([key, value]) => [key, value])),
  };
}

// Agents that have a capability, for routing hints in the delegation help.
export function agentsWith(capability, agentIds) {
  return agentIds.filter((id) => Boolean(capabilityOf(id)[capability]));
}

// Permission modes, chosen per message in the composer and capped per agent
// in CONNECTIONS. The human's mode is the ceiling of any plan it starts.
//   #0 GHOST     off the record: nothing enters the log or anyone's context
//   #1 EXCHANGE  read the project, coordinate with the others (default)
//   #2 CREATE    create files and images inside the turn's .pulse/out/ lease
//   #3 CONTROL   read, create and modify the project itself (phase C)
export const MODES = {
  0: { key: 'ghost', label: 'GHOST', hint: 'off the record · nothing is saved or remembered' },
  1: { key: 'exchange', label: 'EXCHANGE', hint: 'read the project and coordinate · default' },
  2: { key: 'create', label: 'CREATE', hint: 'create files and images inside .pulse/out/' },
  3: { key: 'control', label: 'CONTROL', hint: 'modify the project itself · only this agent · needs the override' },
};
export const MODE_MAX = 3;
export const normalizeMode = (value, fallback = 1) => {
  const mode = Number(value);
  return Number.isInteger(mode) && mode >= 0 && mode <= MODE_MAX ? mode : fallback;
};

// Scopes are the capabilities the human has switched on for CREATE. A scope
// can only be enabled where the CLI has the capability; by default file
// creation and image generation are on wherever possible, web stays off.
export const SCOPES = ['write', 'imageGen', 'web'];
export const SCOPE_LABELS = { write: 'create files', imageGen: 'generate images', web: 'web access' };

export function resolveScopes(agentId, configured = {}) {
  const caps = capabilityOf(agentId);
  const scopes = {};
  for (const scope of SCOPES) {
    const capable = Boolean(caps[scope]);
    const wanted = configured[scope] ?? (scope !== 'web');
    scopes[scope] = { capable, enabled: capable && wanted, wired: true };
  }
  // A standing lease: every turn of this agent may create files inside
  // .pulse/out/ without the human arming CREATE each time. Opt-in per agent.
  scopes.write.always = Boolean(configured.alwaysCreate) && scopes.write.enabled;
  // The ceiling: how far the composer may take this agent. Writing needs the
  // CLI to be able to write; CONTROL is capped at 2 until phase C wires it.
  const wanted = normalizeMode(configured.maxMode, scopes.write.enabled ? 2 : 1);
  scopes.maxMode = Math.min(wanted, scopes.write.capable ? 3 : 1);
  scopes.defaultMode = scopes.write.always && scopes.maxMode >= 2 ? 2 : 1;
  return scopes;
}

// One line per agent for the orchestrator: who can do what right now.
export function abilityLine(agentId, scopes) {
  const on = SCOPES.filter((scope) => scopes[scope]?.enabled && scopes[scope]?.wired).map((scope) => SCOPE_LABELS[scope]);
  const cannot = SCOPES.filter((scope) => !scopes[scope]?.capable).map((scope) => SCOPE_LABELS[scope]);
  return `@${agentId}: can ${on.length ? on.join(', ') : 'only read'}${cannot.length ? `; cannot ${cannot.join(', ')}` : ''}`;
}
