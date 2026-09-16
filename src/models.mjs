import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
};

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
    if (agent.id === 'codex') {
      discovered = parseCodexModelCache(await readFile(join(home, '.codex', 'models_cache.json'), 'utf8').catch(() => ''));
      cliDefault = parseCodexDefaultModel(await readFile(join(home, '.codex', 'config.toml'), 'utf8').catch(() => ''));
    }
    if (agent.id === 'opencode' && agent.detected) {
      discovered = await listOpenCode(agent).catch(() => []);
      cliDefault = process.env.PULSE_OPENCODE_MODEL ?? null;
    }
    const custom = Array.isArray(config.models?.[agent.id]) ? config.models[agent.id] : [];
    result[agent.id] = {
      models: unique([...custom, ...discovered, ...known.defaults]),
      default: cliDefault,
      note: known.note,
      source: discovered.length ? 'discovered' : 'known',
    };
  }
  return result;
}
