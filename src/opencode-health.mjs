// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// What OpenCode can answer with on this computer (2026-10-19). OpenCode sends each turn to the
// provider of its model, and a provider can stop answering on its own: an API key with no credit
// left, or one that is no longer valid. A person met it as a red card in English on every turn,
// and had to find out alone which model would work and where to change it. MADRE now remembers,
// per person (~/.pulse/opencode.json), the last model that answered and the providers that failed
// and why, so the failure itself can offer the way out: retry on a model that works, or keep it.
// A provider's mark goes away the next time a turn on it answers.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { diagnose } from '../public/troubleshooting.js';

const file = (stateRoot) => join(stateRoot, 'opencode.json');
const read = async (stateRoot) => { try { return JSON.parse(await readFile(file(stateRoot), 'utf8')) ?? {}; } catch { return {}; } };
async function keep(stateRoot, data) {
  await mkdir(stateRoot, { recursive: true });
  const temp = `${file(stateRoot)}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2));
  await rename(temp, file(stateRoot));
}

const OPENCODE_PICK = 'opencode/big-pickle';
export const providerOf = (model) => (typeof model === 'string' && model.includes('/') ? model.split('/')[0] : null);

// Which of MADRE's known conditions this failure is, said as what the provider needs.
const KINDS = { 'provider-credit-exhausted': 'no-credit', 'opencode-default-provider': 'bad-key' };
export function problemOf(error) {
  for (const condition of diagnose(error, 'opencode')) if (KINDS[condition.id]) return KINDS[condition.id];
  return null;
}

// One turn of OpenCode that ended: what answered is remembered, what failed for its provider too.
export async function noteOpenCodeTurn(stateRoot, { ok, model = null, error = null, now = new Date() }) {
  const provider = providerOf(model);
  const data = await read(stateRoot);
  data.problems ??= {};
  if (ok) {
    if (model) data.worked = { model, at: now.toISOString() };
    if (provider && data.problems[provider]) delete data.problems[provider];
  } else {
    const kind = problemOf(error);
    if (!kind || !provider) return data;
    data.problems[provider] = { kind, model, at: now.toISOString() };
  }
  await keep(stateRoot, data);
  return data;
}

export const openCodeHealth = async (stateRoot) => { const data = await read(stateRoot); return { worked: data.worked ?? null, problems: data.problems ?? {} }; };

// The model to offer instead of one that failed: the last one that answered, if its provider is
// not the one in trouble; otherwise one of OpenCode's own free models, which need no account.
export function suggestOpenCodeModel(health, { failed = null, own = [] } = {}) {
  const bad = new Set([providerOf(failed), ...Object.keys(health?.problems ?? {})].filter(Boolean));
  const worked = health?.worked?.model;
  if (worked && worked !== failed && !bad.has(providerOf(worked))) return { model: worked, why: 'worked' };
  // OpenCode's own pick when it is told no model (`opencode run` answers on big-pickle) goes first;
  // the rest in the order the CLI lists them.
  const free = [...own].sort((a, b) => Number(b === OPENCODE_PICK) - Number(a === OPENCODE_PICK)).find((model) => !bad.has(providerOf(model)));
  return free ? { model: free, why: 'free' } : null;
}
