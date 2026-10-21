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

export const CURSOR_FREE_NOTE = 'Your Cursor plan answers only with Auto: the other models need a paid plan.';
export const KNOWN_MODELS = {
  codex: {
    defaults: ['gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.5'],
    note: 'The models your plan offers in Codex. «default» is the one Codex uses on its own.',
  },
  claude: {
    defaults: ['fable', 'opus', 'sonnet', 'haiku'],
    note: 'Each name is the newest model of its family that your Claude plan offers. You can also write a full model name.',
  },
  // Read from Google with the Gemini key when there is one (2026-10-21); these when there is not.
  gemini: {
    defaults: ['auto', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    note: '«auto» lets Gemini choose between its fast model and its strongest one. The others are the ones your Gemini key opens.',
    unread: 'These are the usual ones. Signed in with a Gemini API key, MADRE shows the ones your account opens.',
  },
  opencode: {
    defaults: [],
    note: 'provider/model, from `opencode models`. The room default is PULSE_OPENCODE_MODEL.',
  },
  // Read from the account itself (`cursor-agent --list-models`, 2026-10-21); «auto» alone when it
  // cannot be read. The four names that stood here were long gone from Cursor's list.
  cursor: {
    defaults: ['auto'],
    note: '«auto» lets Cursor choose. The others are the ones your Cursor account lists; a free plan answers only with Auto.',
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

// Google's list for a Gemini key (`GET v1beta/models`): the models that converse, by their short
// names, «auto» first — the Gemini CLI's own routing. Embedding, image, voice, live and the
// computer-use models are for other work and are left out.
const GEMINI_NOT_CHAT = /embedding|image|imagen|nano-banana|tts|audio|transcribe|live|computer-use|customtools|robotics|aqa|veo|gemma/i;
// The order a person looks for: the «latest» names, then newest first, and in each version the
// strongest first (pro, then flash, then lite).
const geminiRank = (name) => {
  const version = /latest/.test(name) ? 999 : Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const tier = /lite/.test(name) ? 2 : /flash/.test(name) ? 1 : 0;
  return [version, tier];
};
export function parseGeminiModels(json) {
  let data = json;
  if (typeof json === 'string') { try { data = JSON.parse(json); } catch { return []; } }
  const names = [];
  for (const one of Array.isArray(data?.models) ? data.models : []) {
    const name = String(one?.name ?? '').replace(/^models\//, '');
    if (!/^gemini-/.test(name) || GEMINI_NOT_CHAT.test(name) || !isValidModelName(name)) continue;
    if (Array.isArray(one.supportedGenerationMethods) && !one.supportedGenerationMethods.includes('generateContent')) continue;
    if (!names.includes(name)) names.push(name);
  }
  names.sort((a, b) => { const [va, ta] = geminiRank(a); const [vb, tb] = geminiRank(b); return vb - va || ta - tb || a.localeCompare(b); });
  return names.length ? ['auto', ...names] : [];
}

// `cursor-agent --list-models` prints «id - Label» a line, after a heading: the ids, «auto» first.
export function parseCursorModels(text) {
  const ids = [];
  for (const line of String(text ?? '').split('\n')) {
    const found = line.match(/^\s*([A-Za-z0-9][\w.:[\]-]*)\s+-\s+\S/);
    if (found && isValidModelName(found[1]) && !ids.includes(found[1])) ids.push(found[1]);
  }
  return ids.includes('auto') ? ['auto', ...ids.filter((id) => id !== 'auto')] : ids;
}

export async function discoverModels({ agents = [], config = {}, home = homedir(), listOpenCode = async () => [], listCursor = async () => [], cursorOnlyAuto = () => false, listGemini = async () => [] } = {}) {
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
    if (agent.id === 'gemini' && agent.detected) discovered = await listGemini(agent).catch(() => []);
    if (agent.id === 'cursor' && agent.detected) {
      // A free plan refuses every named model (adapters/cursor.mjs): then Auto is all there is.
      discovered = cursorOnlyAuto() ? ['auto'] : await listCursor(agent).catch(() => []);
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
    if (agent.id === 'cursor' && discovered.length > 1) groups = groupCursor(unique([...custom, ...discovered]));
    result[agent.id] = {
      ...(groups ? { groups } : {}),
      // What the account itself lists, when it can be read, is the whole choice: the names written
      // here are only for a CLI that cannot say (2026-10-21). Added to it, they offered models the
      // plan did not have, and a turn that failed on them.
      models: unique([...custom, ...(discovered.length ? discovered : known.defaults)]),
      default: cliDefault,
      note: agent.id === 'cursor' && cursorOnlyAuto() ? CURSOR_FREE_NOTE : !discovered.length && known.unread ? known.unread : known.note,
      efforts,
      effortDefault: isValidEffort(agent.id, effortDefault) ? effortDefault : null,
      ...(effortsByModel ? { effortsByModel, effortsShared } : {}),
      source: discovered.length ? 'discovered' : 'known',
      ...(agent.id === 'cursor' && cursorOnlyAuto() ? { onlyAuto: true } : {}),
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
// Cursor lists every model of every house, each in several speeds (265 on 2026-10-21): shown under
// the house it comes from, Cursor's own first, so the chooser can be read.
const CURSOR_HOUSES = [
  ['cursor', 'Cursor', /^(auto|composer|cursor-small)/],
  ['openai', 'OpenAI', /^(gpt|o\d|codex)/],
  ['anthropic', 'Anthropic', /^claude/],
  ['google', 'Google', /^gemini/],
  ['xai', 'xAI', /^(cursor-)?grok/],
  ['deepseek', 'DeepSeek', /^deepseek/],
  ['moonshot', 'Moonshot', /^kimi/],
];
export function groupCursor(names = []) {
  const groups = new Map();
  for (const name of names) {
    const [id, label] = CURSOR_HOUSES.find(([, , test]) => test.test(name)) ?? ['other', 'Other'];
    if (!groups.has(id)) groups.set(id, { id, label, own: id === 'cursor', models: [] });
    groups.get(id).models.push(name);
  }
  const order = [...CURSOR_HOUSES.map(([id]) => id), 'other'];
  return [...groups.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

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
