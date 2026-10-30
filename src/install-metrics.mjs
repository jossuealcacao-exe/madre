// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// WHAT THE AUTHOR LEARNS OF EACH COPY (2026-10-30), never of the person: how the copy runs and where,
// whether it was installed, updated or uninstalled, and whether it is on right now. Three things,
// all inside the anonymous diagnostics (src/telemetry.mjs) and off with it (Settings › Version and
// reports, or PULSE_TELEMETRY=0):
//
//   · the environment — numbers and names of MADRE's own parts, written as the diagnostics' gauges:
//     cores and memory (GB), the language MADRE speaks, how it was installed (npx, global, project,
//     source), the shell's name, whether Ollama is there and on, which agents are installed and ready,
//     how many projects and how many open, which of MADRE's own modules are on, and how many days the
//     copy has. No path, no project name, no file, nothing a person wrote; a module the person wrote
//     only counts as «another».
//   · its life — counts: installed (a copy that never had an identifier), updated (a new version
//     first opened), uninstalled (Settings › Uninstall, sent before anything is removed), and each
//     time Home starts.
//   · its presence — every few minutes while MADRE is open, the random id, the version and the system
//     to madre.run/api/presence, so the author knows how many copies are on now. One process of the
//     copy says it; the others see it was said.
//
// docs/REFERENCE.md › «Lo que sale de la máquina» says all of it; madre.run's privacy page too.
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { installId } from './heartbeat.mjs';
import { compareVersions } from './updates.mjs';

export const PRESENCE_URL = 'https://madre.run/api/presence';
export const PRESENCE_EVERY_MS = 5 * 60 * 1000;
const KEY_PART = /^[a-z0-9][a-z0-9-]{0,30}$/;
const CHANNELS = new Set(['npx', 'global', 'project', 'source']);
const SHELLS = new Set(['zsh', 'bash', 'fish', 'sh', 'pwsh', 'powershell', 'nu', 'dash', 'ksh', 'tcsh']);
const GB = 1024 ** 3;

// The environment as gauges: only keys made of MADRE's own words, only numbers.
export function environmentGauges({ cores = 0, ramBytes = 0, language = null, install = null, shell = '', ollama = {}, agents = [], projects = {}, modules = [], ownModules = new Set(), ageDays = null } = {}) {
  const out = {};
  if (cores > 0) out['env.cores'] = Math.round(cores);
  if (ramBytes > 0) out['env.ram'] = Math.max(1, Math.round(ramBytes / GB));
  if (language === 'es' || language === 'en') out[`env.lang.${language}`] = 1;
  if (CHANNELS.has(install)) out[`env.channel.${install}`] = 1;
  const shellName = basename(String(shell ?? '')).toLowerCase().replace(/\.exe$/, '');
  if (shellName) out[`env.shell.${SHELLS.has(shellName) ? shellName : 'other'}`] = 1;
  if (ollama.installed || ollama.running) out['env.ollama'] = 1;
  if (ollama.running) out['env.ollama.on'] = 1;
  if (Number.isFinite(ollama.models)) out['env.ollama.models'] = ollama.models;
  for (const one of agents) {
    if (!KEY_PART.test(String(one?.id ?? ''))) continue;
    if (one.detected) out[`agent.${one.id}`] = 1;
    if (one.ready) out[`agent.${one.id}.ready`] = 1;
  }
  out['agents.ready'] = agents.filter((one) => one?.ready).length;
  if (Number.isFinite(projects.total)) out['projects.total'] = projects.total;
  if (Number.isFinite(projects.open)) out['projects.open'] = projects.open;
  let others = 0;
  for (const id of modules) {
    if (ownModules.has(id) && KEY_PART.test(id)) out[`module.${id}`] = 1;
    else others += 1;
  }
  out['modules.on'] = modules.length;
  if (others) out['modules.other'] = others;
  if (Number.isFinite(ageDays) && ageDays >= 0) out['install.age'] = Math.floor(ageDays);
  return out;
}

// Installed, updated or neither, said once per change: ~/.pulse/lifecycle.json keeps the version this
// copy last opened. A copy with no record and no identifier is new; with an identifier but no record
// it was there before 1.1.0 and is counted as updated. A version older than the last one counts as
// neither (someone went back on purpose).
export async function noteLifecycle({ root, version, hadId, now = new Date() }) {
  const file = join(root, 'lifecycle.json');
  let kept = null;
  try { kept = JSON.parse(await readFile(file, 'utf8')); } catch { /* none yet */ }
  let event = null;
  if (!kept?.version) event = hadId ? 'update' : 'install';
  else if (kept.version !== version && compareVersions(version, kept.version) > 0) event = 'update';
  if (!kept?.version || kept.version !== version) {
    await writeFile(file, `${JSON.stringify({ first: kept?.first ?? now.toISOString(), version, at: now.toISOString() })}\n`).catch(() => null);
  }
  return { event, first: kept?.first ?? now.toISOString() };
}

// Where the presence goes: a copy that sends its diagnostics elsewhere (tests, QA houses) sends its
// presence beside them, never to madre.run.
export function presenceUrl(env = process.env) {
  if (env.PULSE_PRESENCE_URL) return env.PULSE_PRESENCE_URL;
  if (env.PULSE_TELEMETRY_URL) return env.PULSE_TELEMETRY_URL.replace(/\/telemetry\/?$/, '/presence');
  return PRESENCE_URL;
}

export const presenceBody = ({ id, version, platform = process.platform }) => ({
  id, version, os: ['darwin', 'linux', 'win32'].includes(platform) ? platform : 'other',
});

// «Still here», at most once every few minutes per copy, whichever of its processes gets there first.
export async function sayPresent({ root, version, fetchImpl = globalThis.fetch, url = presenceUrl(), now = Date.now() }) {
  const mark = join(root, 'presence-at');
  const last = Number((await readFile(mark, 'utf8').catch(() => '')).trim()) || 0;
  if (now - last < PRESENCE_EVERY_MS - 30_000) return { sent: false, reason: 'recent' };
  await writeFile(mark, String(now)).catch(() => null);
  try {
    const body = presenceBody({ id: await installId(root), version });
    const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    return response.ok ? { sent: true, body } : { sent: false, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { sent: false, reason: error?.message ?? 'unreachable' };
  }
}
