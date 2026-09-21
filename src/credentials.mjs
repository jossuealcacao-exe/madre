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

// What the room offers for each agent that cannot be signed in with a click.
export function keyPlanFor(id) {
  if (id === 'gemini') {
    return {
      agent: 'gemini',
      label: 'Gemini API key',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      writesTo: '~/.gemini/.env',
      note: 'The key is written where the Gemini CLI looks for it, readable only by you. MADRE keeps no copy.',
      providers: null,
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

// ---- OpenCode: an entry in its auth.json, confirmed by asking `opencode auth list`.
async function applyOpenCodeKey(key, { home, provider, executable, run }) {
  const known = OPENCODE_PROVIDERS.some((item) => item.id === provider);
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
    const listed = await run(executable, ['auth', 'list']);
    if (!new RegExp(provider, 'i').test(listed)) {
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
  if (agent === 'gemini') return applyGeminiKey(checked.key, { home, probe });
  if (agent === 'opencode') return applyOpenCodeKey(checked.key, { home, provider, executable, run });
  return { ok: false, error: `${agent} does not take a key here: it signs in with a click.` };
}
