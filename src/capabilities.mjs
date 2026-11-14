// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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

// @madre, the room's local memory agent, is not a CLI: capabilityOf gives it the read-only profile.
export const CAPABILITIES = {
  codex: {
    read: true,
    imageIn: { how: '-i <file>', note: 'Images attach to the prompt directly.' },
    write: { how: '-C <outdir> --sandbox workspace-write', note: 'Reads the whole project, writes only inside the lease directory.' },
    imageGen: { how: 'features.image_generation (stable, enabled)', note: 'Generated with the ChatGPT account; saved into the lease directory.' },
    web: { how: '--search (live web_search tool)', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
  claude: {
    read: true,
    imageIn: { how: 'Read tool on the attachment path', note: 'The attachments folder is added with --add-dir.' },
    write: { how: '--tools Write,Edit + permission rules', note: 'Write/Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: '--tools WebFetch,WebSearch', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
  gemini: {
    read: true,
    imageIn: { how: 'read_file on the attachment path', note: 'The attachments folder is added with --include-directories.' },
    write: { how: 'policy: allow write_file/edit with argsPattern', note: 'Paths outside the lease directory stay denied.' },
    imageGen: false,
    web: { how: 'policy: allow google_web_search, web_fetch', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
  // Cursor reads in its own ask mode and, from 2026-10-21, writes and runs commands at the modes
  // that allow it (adapters/cursor.mjs). Attachments are named in the briefing.
  cursor: {
    read: true,
    imageIn: false,
    write: { how: 'agent mode with --force under a configuration made for the turn', note: 'Writes where the turn allows; commands only at #4. MADRE locks and puts back .env, .git and its own folders, and at #2 what existed.' },
    imageGen: false,
    // Its own WebSearch and WebFetch (2026-11-10, tried against the real CLI): in print mode they wait
    // for an approval nobody gives, so a reading turn with the web on runs ask mode with --force, while
    // the turn's configuration still denies every command and every write (nothing was written or run).
    web: { how: '--mode ask --force, Shell(*) and Write(**) denied', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
  // Grok (adapters/grok.mjs, 2026-11-06): reads, and from the same day writes at #2 and #3 and runs
  // commands at #4, each mode tried against the real CLI first. Attachments are named in the briefing.
  grok: {
    read: true,
    imageIn: false,
    write: { how: '--tools …,search_replace,write under --permission-mode dontAsk (#4: the terminal too, --always-approve)', note: 'Writes where the turn allows; commands only at #4. Every place nobody writes is denied one rule at a time, and MADRE locks and puts back .env, .git and its own folders, and at #2 what existed.' },
    // Its own image tool (2026-11-08): the images land in Grok's folder; MADRE copies them into the turn's
    // draft folder at #2 and into imagenes/ at #3 and #4 (src/lease.mjs, grokImagesDir).
    imageGen: { how: 'image_gen, copied by MADRE into the project', note: 'Generated with the Grok account; MADRE copies each image into the draft folder at #2 and into imagenes/ at #3 and #4.' },
    // Its own search and page reader (2026-11-07): off until Web access is turned on for it.
    web: { how: '--tools …,web_search,web_fetch', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
  opencode: {
    read: true,
    imageIn: { how: '-f <file>', note: 'Files attach to the message.' },
    write: { how: 'permission.edit patterns', note: 'Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: 'permission.webfetch / websearch = allow', note: 'On by default; turned off per agent in Settings › Agents › Web access.' },
  },
};

// An agent MADRE reaches through its provider's API instead of its CLI (Gemini with only a key,
// src/adapters/gemini-rest.mjs): a request with the briefing and an answer back. It does not read
// the project, see attachments, write, draw or search, so it answers at #1 at most.
export const API_ONLY = {
  read: false,
  imageIn: false,
  write: false,
  imageGen: false,
  web: false,
  note: 'Answers through the provider\'s API: it does not read the project or attachments, and writes nothing. Install the CLI for the rest.',
};
const viaApi = new Set();
export function setAgentsViaApi(agents = []) {
  viaApi.clear();
  for (const agent of agents) if (agent?.viaApi) viaApi.add(agent.id);
}

// MADRE modules can add abilities a CLI lacks. Image Studio (MADRE's own MCP
// image server on the image model chosen in MODULES › Images: Gemini, OpenAI or
// Grok) gives Gemini CLI, Claude Code and OpenCode image generation; Codex and
// Grok keep their native one. `stateRoot` and `home` are where its server looks
// for the key (2026-11-14): paths, never a key.
let imageModule = { enabled: false };
export function setImageModule(state) {
  imageModule = { enabled: Boolean(state?.enabled), model: state?.model ?? null, stateRoot: state?.stateRoot ?? null, home: state?.home ?? null };
}
export const imageModuleState = () => ({ ...imageModule });

export const capabilityOf = (agentId) => {
  if (viaApi.has(agentId)) return API_ONLY;
  const base = CAPABILITIES[agentId] ?? { read: true, imageIn: false, write: false, imageGen: false, web: false };
  if (!base.imageGen && imageModule.enabled && ['gemini', 'claude', 'opencode'].includes(agentId)) {
    return { ...base, imageGen: { how: 'MADRE Image Studio (MCP tool generate_image, the model chosen in Modules › Images)', note: `Attached only inside a creation lease with the image scope on${imageModule.model ? ` · model ${imageModule.model}` : ''}.`, module: 'image-studio' } };
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
// Permission modes, chosen per message in the composer and capped per agent
// in Settings › Permissions. The human's mode is the ceiling of any plan it starts.
//   #0 GHOST     off the record: nothing enters the log or anyone's context
//   #1 EXCHANGE  read the project, coordinate with the others (default)
//   #2 CREATE    create files and images inside the turn's .pulse/out/ lease
//   #3 CONTROL   read, create and modify the project itself (phase C)
export const MODES = {
  0: { key: 'ghost', label: 'GHOST', hint: 'off the record · nothing is saved or remembered' },
  1: { key: 'exchange', label: 'EXCHANGE', hint: 'read the project and coordinate · default' },
  2: { key: 'create', label: 'CREATE', hint: 'create files and images inside .pulse/out/' },
  3: { key: 'control', label: 'CONTROL', hint: 'modify the project itself · only this agent · needs the override' },
  4: { key: 'airlock', label: 'AIRLOCK', hint: 'run commands, push, deploy · what leaves the ship does not come back · override, twice' },
};
export const MODE_MAX = 4;
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
    // Web access is on unless the person turns it off in Settings › Agents (2026-11-14, the author).
    const wanted = configured[scope] ?? true;
    scopes[scope] = { capable, enabled: capable && wanted, wired: true };
  }
  // One ceiling per agent: MAX MODE. Writing follows from it: an agent capped at #1 never
  // writes, one allowed to #2 or #3 does. A `write: false` from an older config reads as #1.
  const capableMax = scopes.write.capable ? 4 : 1;
  const legacyCap = configured.write === false ? 1 : 4;
  scopes.maxMode = Math.min(normalizeMode(configured.maxMode, scopes.write.capable ? 2 : 1), legacyCap, capableMax);
  scopes.write.enabled = scopes.write.capable && scopes.maxMode >= 2;
  // One start per agent: DEFAULT MODE, #1 or #2, never above the ceiling. An older
  // `alwaysCreate` reads as #2. `write.always` keeps its name for the room's code.
  scopes.defaultMode = Math.min(normalizeMode(configured.defaultMode, configured.alwaysCreate ? 2 : 1), 2, Math.max(1, scopes.maxMode));
  scopes.write.always = scopes.defaultMode >= 2 && scopes.write.enabled;
  return scopes;
}

// One line per agent for the orchestrator: who can do what right now.
export function abilityLine(agentId, scopes) {
  const on = SCOPES.filter((scope) => scopes[scope]?.enabled && scopes[scope]?.wired).map((scope) => SCOPE_LABELS[scope]);
  const cannot = SCOPES.filter((scope) => !scopes[scope]?.capable).map((scope) => SCOPE_LABELS[scope]);
  return `@${agentId}: can ${on.length ? on.join(', ') : 'only read'}${cannot.length ? `; cannot ${cannot.join(', ')}` : ''}`;
}
