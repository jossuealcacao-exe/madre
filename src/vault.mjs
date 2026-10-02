// The vault: where a connector's secret lives.
//
// Until now MADRE held none. A key for Gemini or OpenCode is written where THAT CLI looks for it
// and MADRE keeps no copy — which is a promise worth having, and it only works because there is a
// CLI to hand it to. A connector has none: the module itself is what talks to the service, so if
// MADRE does not hold the secret, nobody does.
//
// So it holds them, and the terms are these:
//
//   · One file per module, under `<stateRoot>/credentials/`, `0600` inside a `0700` directory.
//   · Never in the config, never in the ledger, never in a log, never in a prompt. The ledger
//     records that a secret was SET and under which name — never the value, the same way privacy
//     counts how many terms it guards and never which.
//   · Written only from this computer. The server refuses a secret arriving over the network.
//   · `summary()` is what every other part of MADRE is allowed to see: names and sizes, no values.
//
// Nothing here reads a secret into a turn. A module asks for its own and hands it to the server it
// spawns, through that process's environment — which is how a CLI gets one too.

import { chmod, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OWNER_ONLY = 0o600;
const OWNER_DIR = 0o700;
const MAX_SECRET = 8000;

export const vaultDir = (stateRoot) => join(stateRoot, 'credentials');
const fileFor = (stateRoot, moduleId) => join(vaultDir(stateRoot), `${moduleId}.json`);

// A module id and a secret name are both file-ish and both come from outside: anything that is
// not plainly a name is refused rather than sanitised, because a sanitised path is a path that
// looked wrong and was used anyway.
const NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
export const validName = (value) => NAME.test(String(value ?? ''));

async function readAll(stateRoot, moduleId) {
  try { return JSON.parse(await readFile(fileFor(stateRoot, moduleId), 'utf8')); }
  catch { return {}; }
}

// What a module put away, for the module itself. The only function in MADRE that returns a value.
export async function readSecret(stateRoot, moduleId, name) {
  if (!validName(moduleId) || !validName(name)) return null;
  const secret = (await readAll(stateRoot, moduleId))[name];
  return typeof secret === 'string' && secret ? secret : null;
}

export async function writeSecret(stateRoot, moduleId, name, value) {
  if (!validName(moduleId)) return { ok: false, error: 'That is not a module id.' };
  if (!validName(name)) return { ok: false, error: 'That is not a secret name.' };
  const secret = String(value ?? '').trim();
  if (!secret) return { ok: false, error: 'Paste the secret first.' };
  if (/\s/.test(secret)) return { ok: false, error: 'That does not look like a secret: it has spaces or line breaks.' };
  if (secret.length > MAX_SECRET) return { ok: false, error: 'That is too long to be a secret.' };
  const dir = vaultDir(stateRoot);
  await mkdir(dir, { recursive: true, mode: OWNER_DIR });
  // An older vault directory may predate this mode; set it either way rather than trust the
  // creation flags of a directory that was already there.
  await chmod(dir, OWNER_DIR).catch(() => {});
  const all = await readAll(stateRoot, moduleId);
  all[name] = secret;
  await writeFile(fileFor(stateRoot, moduleId), JSON.stringify(all), { mode: OWNER_ONLY });
  await chmod(fileFor(stateRoot, moduleId), OWNER_ONLY).catch(() => {});
  return { ok: true, name, bytes: secret.length };
}

export async function forgetSecret(stateRoot, moduleId, name = null) {
  if (!validName(moduleId)) return { ok: false, error: 'That is not a module id.' };
  if (name === null) {
    await rm(fileFor(stateRoot, moduleId), { force: true });
    return { ok: true, forgot: 'all' };
  }
  if (!validName(name)) return { ok: false, error: 'That is not a secret name.' };
  const all = await readAll(stateRoot, moduleId);
  if (!(name in all)) return { ok: true, forgot: null };
  delete all[name];
  if (Object.keys(all).length) await writeFile(fileFor(stateRoot, moduleId), JSON.stringify(all), { mode: OWNER_ONLY });
  else await rm(fileFor(stateRoot, moduleId), { force: true });
  return { ok: true, forgot: name };
}

// What the room, the cards and the ledger may know: that a secret is there, what it is called and
// how long it is. Never the secret. This is the only shape that leaves this file for anyone but
// the module that owns it.
export async function summary(stateRoot, moduleId = null) {
  let files = [];
  try { files = (await readdir(vaultDir(stateRoot))).filter((name) => name.endsWith('.json')); }
  catch { return []; }
  const held = [];
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    if (moduleId && id !== moduleId) continue;
    const all = await readAll(stateRoot, id);
    for (const [name, secret] of Object.entries(all)) {
      if (typeof secret !== 'string') continue;
      held.push({ module: id, name, bytes: secret.length });
    }
  }
  return held.sort((a, b) => `${a.module}${a.name}`.localeCompare(`${b.module}${b.name}`));
}
