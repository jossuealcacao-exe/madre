// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Handing a provider key to a CLI that signs in from its own prompt.
//
// MADRE keeps its promise: it never stores a credential of its own. The key the human pastes is
// written where that CLI looks for it, with the file locked to the owner, and MADRE keeps no
// copy: not in ~/.pulse/config.json, not in the room's ledger, not in a log line. What the room
// records is that a key was set, never the key.
//
// Every write is verified on the spot by asking the CLI (or MADRE's own probe) whether it is
// signed in now. If it is not, the previous files are put back, so a format MADRE guessed wrong
// leaves nothing behind.

import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const OWNER_ONLY = 0o600;

// A key is one opaque token: no spaces, no newlines, and long enough to be one.
export function normalizeKey(value) {
  const key = String(value ?? '').trim();
  if (!key) return { ok: false, error: 'Paste the key first.' };
  if (/\s/.test(key)) return { ok: false, error: 'That does not look like a key: it has spaces or line breaks.' };
  if (key.length < 12 || key.length > 400) return { ok: false, error: 'That does not look like a key: check you copied all of it and nothing else.' };
  return { ok: true, key };
}

// OpenCode brings no model of its own. These are the providers MADRE can wire with a key;
// any other still works through `opencode auth login` in a terminal.
export const OPENCODE_PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', label: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'openrouter', label: 'OpenRouter', keyUrl: 'https://openrouter.ai/keys' },
  { id: 'google', label: 'Google AI Studio', keyUrl: 'https://aistudio.google.com/app/apikey' },
];

// The rest of the providers OpenCode knows (2026-10-14): its own catalogue, models.dev, which it
// caches itself. Those a single key opens can be wired from MADRE; the ones that need an account
// id, a region or a second secret stay with `opencode auth login`. Read only, never fetched.
export const OPENCODE_FEATURED = ['anthropic', 'openai', 'google', 'openrouter', 'groq', 'deepseek', 'mistral', 'xai', 'togetherai', 'fireworks-ai', 'cerebras', 'perplexity', 'huggingface', 'deepinfra', 'moonshotai', 'zai', 'cohere', 'vercel'];
export async function readOpenCodeCatalog({ home = homedir(), env = process.env } = {}) {
  const raw = await readIfThere(join(env.XDG_CACHE_HOME || join(home, '.cache'), 'opencode', 'models.json'));
  let data = {};
  try { data = JSON.parse(raw ?? '{}') ?? {}; } catch { data = {}; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const out = [];
  for (const [id, one] of Object.entries(data)) {
    if (!/^[\w.-]{1,60}$/.test(id) || !one || typeof one !== 'object' || !Array.isArray(one.env) || one.env.length !== 1) continue;
    out.push({ id, label: typeof one.name === 'string' && one.name.trim() ? one.name.trim().slice(0, 60) : id, docUrl: typeof one.doc === 'string' && /^https:\/\//.test(one.doc) ? one.doc : null });
  }
  return out;
}
// OpenCode writes its catalogue the first time it runs. A person who has just installed it has none
// yet, and was offered only MADRE's four (2026-10-20): until the catalogue is there, the popular
// ones a single key opens are offered from this copy of it (models.dev, 2026-10-20), each with the
// page of its own documentation the catalogue gives.
export const OPENCODE_BUNDLED = [
  { id: 'groq', label: 'Groq', docUrl: 'https://console.groq.com/docs/models' },
  { id: 'deepseek', label: 'DeepSeek', docUrl: 'https://api-docs.deepseek.com/quick_start/pricing' },
  { id: 'mistral', label: 'Mistral', docUrl: 'https://docs.mistral.ai/getting-started/models/' },
  { id: 'xai', label: 'xAI', docUrl: 'https://docs.x.ai/docs/models' },
  { id: 'togetherai', label: 'Together AI', docUrl: 'https://docs.together.ai/docs/serverless-models' },
  { id: 'fireworks-ai', label: 'Fireworks AI', docUrl: 'https://fireworks.ai/docs/' },
  { id: 'cerebras', label: 'Cerebras', docUrl: 'https://inference-docs.cerebras.ai/models/overview' },
  { id: 'perplexity', label: 'Perplexity', docUrl: 'https://docs.perplexity.ai' },
  { id: 'huggingface', label: 'Hugging Face', docUrl: 'https://huggingface.co/docs/inference-providers' },
  { id: 'deepinfra', label: 'Deep Infra', docUrl: 'https://deepinfra.com/models' },
  { id: 'moonshotai', label: 'Moonshot AI', docUrl: 'https://platform.moonshot.ai/docs/api/chat' },
  { id: 'zai', label: 'Z.AI', docUrl: 'https://docs.z.ai/guides/overview/pricing' },
  { id: 'cohere', label: 'Cohere', docUrl: 'https://docs.cohere.com/docs/models' },
  { id: 'vercel', label: 'Vercel AI Gateway', docUrl: null },
];
// Every provider a key can be pasted for: MADRE's own four first (their key pages), then the
// catalogue's — or, before OpenCode has written one, the copy above — each once, the popular ones
// marked.
export async function openCodeKeyProviders({ home = homedir(), env = process.env } = {}) {
  const read = await readOpenCodeCatalog({ home, env });
  const catalog = read.length ? read : OPENCODE_BUNDLED;
  const byId = new Map(OPENCODE_PROVIDERS.map((one) => [one.id, { ...one, featured: true }]));
  for (const one of catalog) if (!byId.has(one.id)) byId.set(one.id, { id: one.id, label: one.label, keyUrl: one.docUrl, featured: OPENCODE_FEATURED.includes(one.id) });
  const rank = (one) => { const at = OPENCODE_FEATURED.indexOf(one.id); return at < 0 ? Infinity : at; };
  return [...byId.values()].sort((a, b) => Number(b.featured) - Number(a.featured) || rank(a) - rank(b));
}

// What the room offers for each agent that cannot be signed in with a click.
export function keyPlanFor(id) {
  if (id === 'claude') {
    return {
      agent: 'claude',
      label: 'Anthropic API key',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      writesTo: '~/.claude/settings.json',
      // Said plainly because it is true: this file is the Claude CLI's own, not MADRE's. A key
      // there is the one every Claude Code on this computer will use, MADRE's turns included.
      note: 'The key is written where the Claude CLI looks for it, readable only by you. MADRE keeps no copy. It becomes the account Claude Code uses on this computer, here and in your own terminal, until you remove it.',
      providers: null,
    };
  }
  if (id === 'gemini') {
    return {
      agent: 'gemini',
      label: 'Gemini API key',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      writesTo: '~/.gemini/.env',
      note: 'The key is written where the Gemini CLI looks for it, readable only by you. MADRE keeps no copy.',
      providers: null,
      // The way in, ahead of the Google account: Google refuses free personal accounts on this
      // CLI (IneligibleTierError, 2026-10-17), and a key from AI Studio is what works for anyone.
      first: true,
    };
  }
  if (id === 'opencode') {
    return {
      agent: 'opencode',
      label: 'Provider key',
      keyUrl: null,
      writesTo: '~/.local/share/opencode/auth.json',
      note: 'OpenCode brings no model of its own: pick the provider whose key you are pasting. The key is written where OpenCode looks for it, readable only by you. MADRE keeps no copy.',
      providers: OPENCODE_PROVIDERS,
    };
  }
  return null;
}

async function readIfThere(path) {
  try { return await readFile(path, 'utf8'); } catch { return null; }
}
async function restore(path, previous) {
  if (previous === null) await rm(path, { force: true });
  else await writeFile(path, previous, { mode: OWNER_ONLY });
}

// ---- Gemini: a line in ~/.gemini/.env, plus the auth type its settings must select.
async function applyGeminiKey(key, { home, probe }) {
  const dir = join(home, '.gemini');
  const envFile = join(dir, '.env');
  const settingsFile = join(dir, 'settings.json');
  await mkdir(dir, { recursive: true });
  const beforeEnv = await readIfThere(envFile);
  const beforeSettings = await readIfThere(settingsFile);
  try {
    const kept = (beforeEnv ?? '').split('\n').filter((line) => line.trim() && !/^\s*(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=/.test(line));
    await writeFile(envFile, `${[...kept, `GEMINI_API_KEY=${key}`].join('\n')}\n`, { mode: OWNER_ONLY });
    await chmod(envFile, OWNER_ONLY).catch(() => {});
    let settings = {};
    try { settings = JSON.parse(beforeSettings ?? '{}') ?? {}; } catch { settings = {}; }
    settings.security = { ...(settings.security ?? {}), auth: { ...(settings.security?.auth ?? {}), selectedType: 'gemini-api-key' } };
    await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, { mode: OWNER_ONLY });
    const state = await probe();
    if (state?.state !== 'signed-in') {
      await restore(envFile, beforeEnv);
      await restore(settingsFile, beforeSettings);
      return { ok: false, error: `The key was written but Gemini still reads as ${state?.state ?? 'unknown'}${state?.detail ? ` (${state.detail})` : ''}. Nothing was changed.` };
    }
    return { ok: true, detail: state.detail ?? 'via API key' };
  } catch (error) {
    await restore(envFile, beforeEnv);
    await restore(settingsFile, beforeSettings);
    return { ok: false, error: `The key could not be written: ${error.message}` };
  }
}

// ---- Claude: `env.ANTHROPIC_API_KEY` in its own settings, confirmed by `claude auth status`.
// The CLI reads that env block before it runs, which is why a key there is a session: its own
// status answers `api_key` afterwards. Everything else in the file is left as it was.
async function applyClaudeKey(key, { home, probe }) {
  const dir = join(home, '.claude');
  const file = join(dir, 'settings.json');
  await mkdir(dir, { recursive: true });
  const before = await readIfThere(file);
  try {
    let settings = {};
    try { settings = JSON.parse(before ?? '{}') ?? {}; } catch { settings = {}; }
    if (typeof settings !== 'object' || Array.isArray(settings)) settings = {};
    settings.env = { ...(settings.env ?? {}), ANTHROPIC_API_KEY: key };
    await writeFile(file, `${JSON.stringify(settings, null, 2)}\n`, { mode: OWNER_ONLY });
    await chmod(file, OWNER_ONLY).catch(() => {});
    const state = await probe();
    if (state?.state !== 'signed-in') {
      await restore(file, before);
      return { ok: false, error: `The key was written but Claude still reads as ${state?.state ?? 'unknown'}${state?.detail ? ` (${state.detail})` : ''}. Nothing was changed.` };
    }
    return { ok: true, detail: state.detail ?? 'via API key' };
  } catch (error) {
    await restore(file, before);
    return { ok: false, error: `The key could not be written: ${error.message}` };
  }
}

// ---- OpenCode: an entry in its auth.json, confirmed by asking `opencode auth list`.
async function applyOpenCodeKey(key, { home, provider, executable, run }) {
  const known = typeof provider === 'string' ? (await openCodeKeyProviders({ home })).find((item) => item.id === provider) : null;
  if (!known) return { ok: false, error: 'Pick the provider this key belongs to.' };
  const file = join(home, '.local', 'share', 'opencode', 'auth.json');
  await mkdir(join(home, '.local', 'share', 'opencode'), { recursive: true });
  const before = await readIfThere(file);
  try {
    let auth = {};
    try { auth = JSON.parse(before ?? '{}') ?? {}; } catch { auth = {}; }
    auth[provider] = { type: 'api', key };
    await writeFile(file, `${JSON.stringify(auth, null, 2)}\n`, { mode: OWNER_ONLY });
    await chmod(file, OWNER_ONLY).catch(() => {});
    // OpenCode itself is the judge: if its own listing does not show the provider, the shape
    // MADRE wrote is not the shape it reads, and nothing should be left behind.
    // It lists the provider by its name («Together AI»), sometimes by its id.
    const listed = String(await run(executable, ['auth', 'list'])).toLowerCase();
    if (!listed.includes(provider.toLowerCase()) && !listed.includes(String(known.label).toLowerCase())) {
      await restore(file, before);
      return { ok: false, error: `OpenCode does not list ${provider} after the key was written, so MADRE put the file back. Run \`opencode auth login\` in a terminal for this one.` };
    }
    return { ok: true, detail: `${provider} (api)` };
  } catch (error) {
    await restore(file, before);
    return { ok: false, error: `The key could not be written: ${error.message}` };
  }
}

const runOpenCode = async (executable, args) => {
  try {
    const { stdout, stderr } = await execFileAsync(executable, args, { timeout: 15000, env: { ...process.env, NO_COLOR: '1' } });
    return `${stdout}\n${stderr}`;
  } catch (error) {
    return `${error.stdout ?? ''}\n${error.stderr ?? error.message}`;
  }
};

// Writes the key for one agent and answers whether that agent is signed in now.
export async function applyKey({ agent, key, provider = null, home = homedir(), probe, executable = 'opencode', run = runOpenCode }) {
  const checked = normalizeKey(key);
  if (!checked.ok) return checked;
  if (agent === 'claude') return applyClaudeKey(checked.key, { home, probe });
  if (agent === 'gemini') return applyGeminiKey(checked.key, { home, probe });
  if (agent === 'opencode') return applyOpenCodeKey(checked.key, { home, provider, executable, run });
  return { ok: false, error: `${agent} does not take a key here: it signs in with a click.` };
}

// ---- OpenCode's providers, as its auth.json says them: who is signed in and how, never the key.
// `api` is a key (MADRE's or one pasted in a terminal), `oauth` an account signed in from
// `opencode auth login`. Anything unreadable reads as nobody.
export async function readOpenCodeProviders({ home = homedir() } = {}) {
  const raw = await readIfThere(join(home, '.local', 'share', 'opencode', 'auth.json'));
  let auth = {};
  try { auth = JSON.parse(raw ?? '{}') ?? {}; } catch { auth = {}; }
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) return [];
  return Object.entries(auth)
    .filter(([id, entry]) => /^[\w.-]{1,60}$/.test(id) && entry && typeof entry === 'object')
    .map(([id, entry]) => ({ id, type: entry.type === 'api' || entry.type === 'oauth' ? entry.type : 'other' }));
}

// Takes a provider's key out of OpenCode's auth.json, the other entries untouched. Only a key
// (`api`): an account signed in with OpenCode's own login is signed out where it was signed in.
// OpenCode is the judge again: if it still lists the provider, the file goes back as it was.
export async function removeOpenCodeKey({ provider, home = homedir(), executable = 'opencode', run = runOpenCode } = {}) {
  if (typeof provider !== 'string' || !/^[\w.-]{1,60}$/.test(provider)) return { ok: false, error: 'Pick the provider whose key goes.' };
  const file = join(home, '.local', 'share', 'opencode', 'auth.json');
  const before = await readIfThere(file);
  let auth = {};
  try { auth = JSON.parse(before ?? '{}') ?? {}; } catch { return { ok: false, error: 'OpenCode\'s auth.json could not be read, so nothing was changed.' }; }
  if (!auth[provider]) return { ok: false, error: `OpenCode has no key for ${provider}.` };
  if (auth[provider].type !== 'api') return { ok: false, error: `${provider} is signed in with its account, not a key: sign it out with \`opencode auth logout\` in a terminal.` };
  try {
    delete auth[provider];
    await writeFile(file, `${JSON.stringify(auth, null, 2)}\n`, { mode: OWNER_ONLY });
    await chmod(file, OWNER_ONLY).catch(() => {});
    const listed = await run(executable, ['auth', 'list']);
    if (new RegExp(`\\b${provider.replace(/[.-]/g, '\\$&')}\\b`, 'i').test(listed.replace(/auth\.json/gi, ''))) {
      await restore(file, before);
      return { ok: false, error: `OpenCode still lists ${provider}, so MADRE put the file back. Remove it with \`opencode auth logout\` in a terminal.` };
    }
    return { ok: true };
  } catch (error) {
    await restore(file, before);
    return { ok: false, error: `The key could not be removed: ${error.message}` };
  }
}
