// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// MADRE'S OWN MODULES, KEPT UP TO DATE BY THE MARKET (2026-10-25, R-2 of the 1.1 road map).
//
// Notes, Reminders and the rest come with MADRE and work from the first day, without internet. A
// fix to one of them used to wait for a new MADRE on npm. Now the signed catalog can carry a newer
// file for it (`builtins`, src/market-remote.mjs), and MADRE runs that one instead of its own.
//
// Because such a file reaches every MADRE on its own — nobody chose to install it — it must pass
// more than a Market module does:
//   · the catalog is signed with the Market's key, as always;
//   · the file is the one the catalog pins (sha256), and
//   · the file itself is signed with the FACTORY key (src/market-key.mjs), a second key kept apart
//     from the Market's: whoever got the Market's key could still not replace Reminders anywhere;
//   · it is written for a contract of the SDK this MADRE understands (`sdk`), says it is the same
//     module, and is newer than the one MADRE came with.
// It is checked again every time it is loaded (src/modules/index.mjs, adoptBuiltinUpdates), and a
// file that fails to load leaves MADRE's own in place. A catalog that takes a version back
// (`revoked`) sends MADRE back to its own. Turning off «Look for new versions» does too.
//
//   ~/.pulse/market/builtin/<id>.mjs     the newer file
//   ~/.pulse/market/builtin/builtin.json what each one is: version, sha256, factory signature

import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { FACTORY_PUBLIC_KEY } from './market-key.mjs';
import { bytesFrom, fitsVersion, MAX_MODULE, marketNews, readJson, sha256, verifySigned, writeAtomic } from './market-remote.mjs';

export const builtinFolder = (stateRoot) => join(stateRoot, 'market', 'builtin');
const recordFile = (stateRoot) => join(builtinFolder(stateRoot), 'builtin.json');
export const builtinFile = (stateRoot, id) => join(builtinFolder(stateRoot), `${id}.mjs`);
export const readBuiltinRecord = async (stateRoot) => (await readJson(recordFile(stateRoot))) ?? {};

// «0.2.0» is newer than «0.1.0»; the same version is not.
export const newer = (have, than) => fitsVersion(have, than) && !fitsVersion(than, have);

// What the catalog offers for MADRE's own modules, fetched and kept when it passes. `packaged` is
// { id: version } of the modules this MADRE came with; `understands(sdk)` says whether a contract
// is one this MADRE speaks. Answers what changed: updated (with what the author wrote) and taken back.
export async function updateBuiltins({ stateRoot, catalog, packaged = {}, understands = () => false, fetchImpl = globalThis.fetch, factoryKey = FACTORY_PUBLIC_KEY, names = {}, now = () => new Date() }) {
  if (!catalog || !factoryKey) return { updated: [], revoked: [] };
  const record = await readBuiltinRecord(stateRoot);
  const updated = [];
  const revoked = [];
  await mkdir(builtinFolder(stateRoot), { recursive: true });

  for (const [id, have] of Object.entries(record)) {
    const taken = (catalog.revoked ?? []).find((one) => one.id === id && (!one.version || one.version === have.version));
    if (!taken) continue;
    await rm(builtinFile(stateRoot, id), { force: true });
    delete record[id];
    revoked.push({ id, name: names[id] ?? id, kind: 'returned', version: have.version, why: taken.why ?? null, at: now().toISOString() });
  }

  for (const entry of catalog.builtins ?? []) {
    const mine = packaged[entry.id];
    if (!mine || !understands(entry.sdk) || !newer(entry.version, mine)) continue;
    if ((catalog.revoked ?? []).some((one) => one.id === entry.id && (!one.version || one.version === entry.version))) continue;
    if (record[entry.id]?.sha256 === entry.file.sha256) continue;
    if (record[entry.id] && !newer(entry.version, record[entry.id].version)) continue;
    try {
      const bytes = await bytesFrom(entry.file.url, { fetchImpl, max: MAX_MODULE });
      if (sha256(bytes) !== entry.file.sha256) continue;
      if (!verifySigned(bytes, entry.file.factory, factoryKey)) continue;
      await writeAtomic(builtinFile(stateRoot, entry.id), bytes);
      const from = record[entry.id]?.version ?? mine;
      record[entry.id] = { version: entry.version, sdk: entry.sdk, sha256: entry.file.sha256, factory: entry.file.factory, at: now().toISOString() };
      updated.push({ id: entry.id, name: names[entry.id] ?? entry.id, from, to: entry.version, changes: entry.changes ?? null, at: now().toISOString() });
    } catch { /* tried again the next time MADRE opens */ }
  }

  if (updated.length || revoked.length) {
    await writeAtomic(recordFile(stateRoot), JSON.stringify(record, null, 2));
    // Said once, the way a Market module's update is (market/updates.json): what came, and what
    // went back to the one MADRE came with, and why.
    const told = [...updated, ...revoked];
    const news = [...(await marketNews(stateRoot)).filter((one) => !told.some((fresh) => fresh.id === one.id)), ...told];
    await writeAtomic(join(stateRoot, 'market', 'updates.json'), JSON.stringify(news, null, 2));
  }
  return { updated, revoked };
}

// The file kept for one of MADRE's own modules, if it is still the one that was signed: its bytes
// against the sha256 and the factory signature recorded when it came. Anything else is not run.
export function trustedBytes(bytes, kept, factoryKey = FACTORY_PUBLIC_KEY) {
  return Boolean(bytes && kept && factoryKey && sha256(bytes) === kept.sha256 && verifySigned(bytes, kept.factory, factoryKey));
}
