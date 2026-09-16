import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// User preferences that should survive terminals: `~/.pulse/config.json`.
// Environment variables always win over the file, so a one-off override
// never has to touch it.

export const configPath = (root = process.env.PULSE_HOME ?? join(homedir(), '.pulse')) => join(root, 'config.json');

export async function loadConfig(root) {
  try {
    const parsed = JSON.parse(await readFile(configPath(root), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return {};
    throw error;
  }
}

export async function saveConfig(root, config) {
  const file = configPath(root);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return file;
}

export async function updateConfig(root, patch) {
  const current = await loadConfig(root);
  const next = { ...current, ...patch };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) next[key] = { ...(current[key] ?? {}), ...value };
  }
  await saveConfig(root, next);
  return next;
}

// Applies file-backed preferences to the process environment without
// overriding anything the user already exported.
export function applyConfigToEnv(config, env = process.env) {
  const applied = {};
  const set = (name, value) => {
    if (value === undefined || value === null || value === '' || env[name] !== undefined) return;
    env[name] = String(value);
    applied[name] = String(value);
  };
  set('PULSE_OPENCODE_MODEL', config.opencode?.model);
  set('PULSE_SOFT_TOKEN_BUDGET', config.room?.softTokenBudget);
  set('PULSE_CONTEXT_MAX_CHARS', config.room?.contextMaxChars);
  set('PULSE_AGENT_TIMEOUT_MS', config.timeouts?.default);
  if (config.room?.delegation === false) set('PULSE_DELEGATION', '0');
  set('PULSE_GEMINI_IDLE_MS', config.gemini?.idleMs);
  set('PULSE_GEMINI_RETRIES', config.gemini?.retries);
  set('PULSE_MAX_PLAN_STEPS', config.room?.maxPlanSteps);
  for (const [agent, value] of Object.entries(config.timeouts ?? {})) {
    if (agent !== 'default') set(`PULSE_${agent.toUpperCase()}_TIMEOUT_MS`, value);
  }
  return applied;
}
