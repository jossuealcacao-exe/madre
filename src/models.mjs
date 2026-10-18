// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { OPENCODE_PROVIDERS } from './credentials.mjs';

// Which model a CLI should use for one turn. Every CLI accepts --model; the
// names come from what is installed locally (Codex's model cache, OpenCode's
// list) plus the aliases each vendor documents. Users can add their own in
// ~/.pulse/config.json under "models".

export const KNOWN_MODELS = {
  codex: {
    defaults: ['gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.5'],
    note: 'Names from ~/.codex/models_cache.json; the CLI default comes from ~/.codex/config.toml.',
  },
  claude: {
    defaults: ['fable', 'opus', 'sonnet', 'haiku'],
    note: 'Aliases resolve to the latest model of each family (e.g. fable → claude-fable-5-1). Full names also work.',
  },
  gemini: {
    defaults: ['auto', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    note: '"auto" lets Gemini CLI route between pro and flash.',
  },
  opencode: {
    defaults: [],
    note: 'provider/model, from `opencode models`. The room default is PULSE_OPENCODE_MODEL.',
  },
  cursor: {
    defaults: ['auto', 'sonnet-4', 'sonnet-4-thinking', 'gpt-5'],
    note: '"auto" lets Cursor choose. `cursor-agent --list-models` names the ones your account has; the room default is PULSE_CURSOR_MODEL.',
  },
};

// How hard the model thinks before it answers, for the CLIs that take it per run. Claude Code
// reads --effort; Codex reads model_reasoning_effort as a config override. Gemini and OpenCode
// have no per-run knob MADRE can name truthfully (OpenCode's --variant means something different
// for each provider), so they get no chooser at all rather than one that guesses.
//
// Ordered lightest first: the composer draws them as a ladder, and the order is the meaning.
//
// Codex's levels belong to each model, not to the CLI. Its own cache (~/.codex/models_cache.json)
// lists the ones each model takes, and the API refuses any other with a 400 — «'minimal' is not
// supported with the 'gpt-5.5' model» — that used to reach the room as a lone «{». The list here is
// every name Codex has used, in order; a turn gets only the ones its model takes.
export const EFFORTS = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  // OpenCode's are each model's «variants» (`opencode run --variant`, 1.18): every rung any provider
  // names. A model offers only its own, read from `opencode models --verbose` (2026-10-14).
  opencode: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
};
// What a Codex with no cache to read is offered: the levels its models have always taken.
const CODEX_SAFE = ['low', 'medium', 'high'];

export function isValidEffort(agentId, effort) {
  return typeof effort === 'string' && (EFFORTS[agentId] ?? []).includes(effort);
}

// Whose model a name is, when the name says so. Codex, Claude and Gemini each answer only to their
// own vendor's models, and a name from another one reaches the CLI as an API error that reads
// like anything but "wrong model" (Gemini: `models/gpt-5.6-sol is not found for API version
// v1beta`). OpenCode is left out on purpose: it speaks to many providers, so any name may be its.
const VENDOR = [
  ['codex', /^(gpt-|o\d|codex-|chatgpt-)/i],
  ['claude', /^(claude|fable|opus|sonnet|haiku)\b/i],
  ['gemini', /^(gemini|gemma|auto$)/i],
];
export function modelOwner(model) {
  return VENDOR.find(([, pattern]) => pattern.test(String(model ?? '')))?.[0] ?? null;
}
// True when the name clearly belongs to another of the three: the turn is better off on the
// agent's own default than sent to fail.
export function belongsElsewhere(agentId, model) {
  if (!VENDOR.some(([id]) => id === agentId)) return false;
  const owner = modelOwner(model);
  return Boolean(owner) && owner !== agentId;
}

// A CLI saying it does not know the model it was given, in any of the ways the four say it.
export const MODEL_NOT_FOUND = /models?\/\S+ is not found|not supported for generateContent|model[_ ]not[_ ]found|unknown model|invalid model|model (?:\S+ )?(?:does not exist|is not available|not found)|issue with the selected model/i;

export function parseCodexDefaultEffort(toml) {
  return String(toml ?? '').match(/^\s*model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1] ?? null;
}

export function parseCodexModelCache(json) {
  try {
    const data = JSON.parse(json);
    const slugs = new Set();
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.slug === 'string' && /^gpt-/.test(node.slug) && !/reserve|auto-review/.test(node.slug)) slugs.add(node.slug);
      for (const value of Object.values(node)) walk(value);
    };
    walk(data);
    return [...slugs].sort();
  } catch {
    return [];
  }
}

// Per model, the efforts it takes (lightest first) and the one it uses when told nothing.
export function parseCodexEfforts(json) {
  try {
    const data = JSON.parse(json);
    const byModel = {};
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.slug === 'string' && Array.isArray(node.supported_reasoning_levels)) {
        const levels = EFFORTS.codex.filter((level) => node.supported_reasoning_levels.some((one) => one?.effort === level));
        if (levels.length) byModel[node.slug] = { levels, default: levels.includes(node.default_reasoning_level) ? node.default_reasoning_level : null };
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(data);
    return byModel;
  } catch {
    return {};
  }
}

// The levels one Codex model takes: its own, from the cache; for a name the cache does not list,
// the ones every listed model shares, so a model MADRE cannot read never meets a refusal.
export function codexLevels(byModel, model) {
  if (model && byModel[model]) return byModel[model].levels;
  const lists = Object.values(byModel).map((one) => one.levels);
  return lists.length ? lists.reduce((shared, levels) => shared.filter((level) => levels.includes(level))) : CODEX_SAFE;
}

export async function readCodexEfforts({ home = homedir() } = {}) {
  const [cache, toml] = await Promise.all([
    readFile(join(home, '.codex', 'models_cache.json'), 'utf8').catch(() => ''),
    readFile(join(home, '.codex', 'config.toml'), 'utf8').catch(() => ''),
  ]);
  return { byModel: parseCodexEfforts(cache), model: parseCodexDefaultModel(toml), effort: parseCodexDefaultEffort(toml) };
}

// Whether a turn's effort reaches Codex: the model it runs on — the one chosen, or the CLI's
// default — has to take it.
export async function codexTakes(model, effort, { home = homedir() } = {}) {
  const read = await readCodexEfforts({ home });
  return codexLevels(read.byModel, model || read.model).includes(effort);
}

export function parseCodexDefaultModel(toml) {
  return String(toml ?? '').match(/^\s*model\s*=\s*"([^"]+)"/m)?.[1] ?? null;
}

export function isValidModelName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,120}$/.test(name);
}

const unique = (list) => [...new Set(list.filter(isValidModelName))];

export async function discoverModels({ agents = [], config = {}, home = homedir(), listOpenCode = async () => [] } = {}) {
  const result = {};
  for (const agent of agents) {
    const known = KNOWN_MODELS[agent.id] ?? { defaults: [], note: '' };
    let discovered = [];
    let cliDefault = null;
    let effortDefault = null;
    let efforts = EFFORTS[agent.id] ?? [];
    let effortsByModel;
    let effortsShared;
    if (agent.id === 'codex') {
      discovered = parseCodexModelCache(await readFile(join(home, '.codex', 'models_cache.json'), 'utf8').catch(() => ''));
      const read = await readCodexEfforts({ home });
      cliDefault = read.model;
      effortDefault = read.effort;
      // The ladder is the model's: the CLI default's here, each model's in the composer once it is
      // chosen. What the CLI does when told nothing is the config's level if that model takes it,
      // or the model's own.
      efforts = codexLevels(read.byModel, cliDefault);
      effortsShared = codexLevels(read.byModel, null);
      effortsByModel = Object.fromEntries(Object.entries(read.byModel).map(([slug, one]) => [slug, { levels: one.levels, default: one.levels.includes(read.effort) ? read.effort : one.default }]));
      if (!efforts.includes(effortDefault)) effortDefault = (cliDefault && read.byModel[cliDefault]?.default) || null;
    }
    if (agent.id === 'opencode') {
      // Nothing until a model is known: the rungs are the model's, never the whole union.
      efforts = [];
      if (agent.detected) {
        const listed = await listOpenCode(agent).catch(() => []);
        discovered = listed.map((one) => (typeof one === 'string' ? one : one?.name)).filter(Boolean);
        cliDefault = process.env.PULSE_OPENCODE_MODEL ?? null;
        const byModel = {};
        for (const one of listed) {
          if (!one || typeof one === 'string' || !Array.isArray(one.variants)) continue;
          const levels = EFFORTS.opencode.filter((level) => one.variants.includes(level));
          if (levels.length) byModel[one.name] = { levels, default: null };
        }
        if (Object.keys(byModel).length) {
          effortsByModel = byModel;
          effortsShared = [];
          efforts = (cliDefault && byModel[cliDefault]?.levels) || [];
        }
      }
    }
    const custom = Array.isArray(config.models?.[agent.id]) ? config.models[agent.id] : [];
    // OpenCode speaks to many providers: what `opencode models` lists is already only the ones
    // signed in plus OpenCode's own. The person may hide a provider from the chooser (AJUSTES ›
    // Project › OpenCode); its models are then left out, never the room default.
    let groups;
    if (agent.id === 'opencode') {
      const hidden = new Set(openCodeHidden(config));
      discovered = discovered.filter((name) => !hidden.has(providerOf(name)));
      groups = groupOpenCode(unique([...custom, ...discovered]));
    }
    result[agent.id] = {
      ...(groups ? { groups } : {}),
      models: unique([...custom, ...discovered, ...known.defaults]),
      default: cliDefault,
      note: known.note,
      efforts,
      effortDefault: isValidEffort(agent.id, effortDefault) ? effortDefault : null,
      ...(effortsByModel ? { effortsByModel, effortsShared } : {}),
      source: discovered.length ? 'discovered' : 'known',
    };
  }
  return result;
}

// `opencode models --verbose` prints each model's name on a line of its own and then its JSON.
// What is read is the name and the variants; a block that does not parse keeps its name.
export function parseOpenCodeVerbose(lines = []) {
  const out = [];
  let current = null;
  let body = [];
  const close = () => {
    if (!current) return;
    let variants = [];
    try { variants = Object.keys(JSON.parse(body.join('\n'))?.variants ?? {}); } catch { /* the name is still a model */ }
    out.push({ name: current, variants });
  };
  for (const raw of lines) {
    const line = String(raw ?? '');
    if (/^[\w.-]+\/[\w.:/-]+$/.test(line.trim()) && !line.startsWith(' ')) { close(); current = line.trim(); body = []; continue; }
    if (current) body.push(line);
  }
  close();
  return out;
}

// ---- OpenCode's models by provider: `provider/model`, named as the person knows the provider.
export const OPENCODE_OWN = 'opencode';
export const providerOf = (name) => String(name ?? '').split('/')[0];
export function openCodeHidden(config = {}) {
  const hidden = config.opencode?.hidden;
  return Array.isArray(hidden) ? hidden.filter((id) => typeof id === 'string' && /^[\w.-]{1,60}$/.test(id)) : [];
}
export function providerLabel(id) {
  if (id === OPENCODE_OWN) return 'OpenCode';
  const known = OPENCODE_PROVIDERS.find((one) => one.id === id);
  if (known) return known.label;
  return id.split(/[-_.]/).map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part)).join(' ');
}
// Groups in a steady order: the providers with a key first, by name; OpenCode's own models last.
export function groupOpenCode(names = []) {
  const byProvider = new Map();
  for (const name of names) {
    if (!/^[\w.-]+\/[\w.:/-]+$/.test(name)) continue;
    const id = providerOf(name);
    if (!byProvider.has(id)) byProvider.set(id, []);
    byProvider.get(id).push(name);
  }
  return [...byProvider.entries()]
    .sort(([a], [b]) => Number(a === OPENCODE_OWN) - Number(b === OPENCODE_OWN) || providerLabel(a).localeCompare(providerLabel(b)))
    .map(([id, models]) => ({ id, label: providerLabel(id), own: id === OPENCODE_OWN, models }));
}
