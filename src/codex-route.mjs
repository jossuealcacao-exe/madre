// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { agentRouteFromEnvironment } from './runtime-detection.mjs';

// Only the routing fields matter here. Other TOML values can contain credentials, so neither
// their contents nor the base URL's path, query or user information ever leave this module.
function tomlString(value) {
  const raw = String(value ?? '').trim();
  if (raw.startsWith('"')) {
    const match = raw.match(/^"(?:\\.|[^"\\])*"/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
  if (raw.startsWith("'")) return raw.match(/^'([^']*)'/)?.[1] ?? null;
  return null;
}

function withoutComment(line) {
  let quote = null;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (escaped) { escaped = false; continue; }
    if (quote === '"' && char === '\\') { escaped = true; continue; }
    if (char === quote) { quote = null; continue; }
    if (!quote && (char === '"' || char === "'")) { quote = char; continue; }
    if (!quote && char === '#') return line.slice(0, i);
  }
  return line;
}

export function codexConfigDestination(toml) {
  let section = '';
  let provider = 'openai';
  let openaiUrl = null;
  let unknown = false;
  const urls = new Map();
  for (const original of String(toml ?? '').split(/\r?\n/)) {
    const line = withoutComment(original);
    if (!line.trim()) continue;
    const table = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (table) { section = table[1].trim(); continue; }
    const assignment = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)$/);
    const mentionsRoute = /\b(?:model_provider|model_providers|openai_base_url)\b/.test(line);
    if (!assignment) { if (mentionsRoute) unknown = true; continue; }
    const [, key, value] = assignment;
    let handled = false;
    if (!section && key === 'model_provider') {
      handled = true;
      const parsed = tomlString(value);
      if (parsed) provider = parsed; else unknown = true;
    } else if (!section && key === 'openai_base_url') {
      handled = true;
      openaiUrl = tomlString(value);
      if (!openaiUrl) unknown = true;
    } else if (!section && key === 'model_providers') {
      handled = true;
      // An inline table could select another base URL. Hold it until it can be inspected.
      unknown = true;
    } else {
      const dotted = !section && key.match(/^model_providers\.([A-Za-z0-9_-]+)\.base_url$/);
      const tableProvider = section.match(/^model_providers\.(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+))$/);
      if ((dotted || tableProvider) && (dotted || key === 'base_url')) {
        handled = true;
        const parsed = tomlString(value);
        if (parsed) urls.set(dotted?.[1] ?? tableProvider?.[1] ?? tableProvider?.[2] ?? tableProvider?.[3], parsed);
        else unknown = true;
      }
    }
    if (!handled && mentionsRoute) unknown = true;
  }
  if (unknown) return { source: 'Codex config.toml', url: null, unknown: true };
  if (provider !== 'openai') return { source: 'Codex config.toml', url: urls.get(provider) ?? null, unknown: !urls.has(provider) };
  return openaiUrl ? { source: 'Codex config.toml', url: openaiUrl, unknown: false } : null;
}

function routeForUrl(url, source, env) {
  let parsed = null;
  try { parsed = new URL(url); } catch { /* An invalid override is not an official destination. */ }
  const host = parsed?.hostname.toLowerCase() ?? null;
  const official = parsed?.protocol === 'https:'
    && (!parsed.port || parsed.port === '443')
    && !parsed.username && !parsed.password
    && (host === 'api.openai.com' || host?.endsWith('.api.openai.com'));
  if (official) return { kind: 'official', destination: 'OpenAI', source, host, custom: false, allowed: true };
  // Let the existing route rule decide whether the person explicitly trusted Codex.
  const allowed = agentRouteFromEnvironment('codex', { ...env, OPENAI_BASE_URL: 'not-a-url' }).allowed;
  return { kind: 'custom', destination: host ? `custom endpoint · ${host}` : 'custom endpoint', source, host, custom: true, allowed };
}

// Recheck at dispatch, not just at room startup: the user can edit config.toml while MADRE is open.
// A missing file means the CLI's default; a file we cannot inspect never counts as official.
export async function codexRoute({ env = process.env } = {}) {
  const environmentRoute = agentRouteFromEnvironment('codex', env);
  const rawEnvironmentUrl = String(env.OPENAI_BASE_URL ?? '').trim();
  if (rawEnvironmentUrl) {
    const checked = routeForUrl(rawEnvironmentUrl, 'OPENAI_BASE_URL', env);
    if (checked.custom) return checked;
  }
  const home = env.CODEX_HOME || join(homedir(), '.codex');
  let config;
  try { config = await readFile(join(home, 'config.toml'), 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT') return environmentRoute;
    return routeForUrl(null, 'Codex config.toml', env);
  }
  const destination = codexConfigDestination(config);
  if (!destination) return environmentRoute;
  return routeForUrl(destination.url, destination.source, env);
}
