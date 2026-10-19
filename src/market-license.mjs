// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// THE MARKET'S PAID MODULES (2026-10-19). A paid module is bought at its checkout (Lemon Squeezy,
// the seller of record, which charges and handles each country's taxes), and the key the buyer
// gets by email is pasted in MADRE once. MADRE asks Lemon Squeezy, that one time and because the
// person pressed «Activate», whether the key is good and is for this module: the answer must name
// the store and the product the signed catalog names, or the key is refused. Kept in
// ~/.pulse/market/licenses.json, readable only by this person, and never asked again: the module
// works offline from then on. «Release» gives the activation back, to use the key elsewhere.
//
// What travels: the key and a name for this computer made from MADRE's random install id
// («MADRE 1a2b3c4d»), never the computer's own name. The module's code is AGPL like MADRE: what is
// paid for is installing it from the Market, its updates and its support, not a lock on the code.

import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { t } from './i18n.mjs';

export const LICENSE_API = 'https://api.lemonsqueezy.com/v1/licenses';
const TIMEOUT_MS = 10000;
const KEY = /^[A-Za-z0-9-]{8,80}$/;

const file = (stateRoot) => join(stateRoot, 'market', 'licenses.json');
const readJson = (path) => readFile(path, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
async function keep(stateRoot, licenses) {
  await mkdir(join(stateRoot, 'market'), { recursive: true });
  const temp = `${file(stateRoot)}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(licenses, null, 2), { mode: 0o600 });
  await rename(temp, file(stateRoot));
  await chmod(file(stateRoot), 0o600).catch(() => {});
}

export const licensesFrom = async (stateRoot) => (await readJson(file(stateRoot))) ?? {};
// What the page may know: which modules are bought, never the keys.
export async function licensedIds(stateRoot) {
  const licenses = await licensesFrom(stateRoot);
  return Object.fromEntries(Object.entries(licenses).map(([id, one]) => [id, { at: one.at ?? null }]));
}
export const isLicensed = async (stateRoot, id) => Boolean((await licensesFrom(stateRoot))[id]?.key);
// A module that costs nothing needs no license; one with a price needs one kept here.
export const mayInstall = async (stateRoot, entry) => !(entry?.price > 0) || isLicensed(stateRoot, entry.id);

async function ask(fetchImpl, path, fields, api) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${api}/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
    const answer = await response.json().catch(() => null);
    return { status: response.status, answer };
  } catch {
    throw new Error(t('MADRE could not reach Lemon Squeezy to check the license. Check your internet connection and try again.'));
  } finally { clearTimeout(timer); }
}

// The catalog's own word on where a module is sold: Lemon Squeezy, and which store and product.
export function saleOf(entry) {
  const license = entry?.license;
  if (!(entry?.price > 0) || license?.provider !== 'lemonsqueezy') return null;
  if (!Number.isInteger(license.store) || !Number.isInteger(license.product)) return null;
  return { store: license.store, product: license.product };
}

export async function activateLicense({ stateRoot, entry, key, installId, fetchImpl = globalThis.fetch, api = LICENSE_API }) {
  const sale = saleOf(entry);
  if (!sale) throw new Error(t('This module is not sold through the Market.'));
  const typed = String(key ?? '').trim();
  if (!KEY.test(typed)) throw new Error(t('That does not look like a license key. Copy it whole from the purchase email.'));
  const { answer } = await ask(fetchImpl, 'activate', { license_key: typed, instance_name: `MADRE ${String(installId ?? '').replace(/-/g, '').slice(0, 8) || 'sin-id'}` }, api);
  if (!answer?.activated) {
    const said = String(answer?.error ?? '');
    if (/limit/i.test(said)) throw new Error(t('This license is already active on as many computers as it allows. Release it on another computer, or buy another one.'));
    throw new Error(t('Lemon Squeezy did not accept that key: {error}', { error: said.slice(0, 200) || t('no reason given') }));
  }
  // A good key for something else is not a key for this module: given back at once.
  const meta = answer.meta ?? {};
  if (meta.store_id !== sale.store || meta.product_id !== sale.product) {
    if (answer.instance?.id) await ask(fetchImpl, 'deactivate', { license_key: typed, instance_id: answer.instance.id }, api).catch(() => null);
    throw new Error(t('That license is for another product, not for «{name}».', { name: entry.id }));
  }
  const licenses = await licensesFrom(stateRoot);
  licenses[entry.id] = { provider: 'lemonsqueezy', key: typed, instance: answer.instance?.id ?? null, at: new Date().toISOString() };
  await keep(stateRoot, licenses);
  return { id: entry.id, at: licenses[entry.id].at };
}

// The activation given back to Lemon Squeezy, so the key can be used on another computer. The
// module stays installed; it is the Market's updates that stop until a key is active again.
export async function releaseLicense({ stateRoot, id, fetchImpl = globalThis.fetch, api = LICENSE_API }) {
  const licenses = await licensesFrom(stateRoot);
  const held = licenses[id];
  if (!held?.key) throw new Error(t('There is no license for «{id}» on this computer.', { id }));
  if (held.instance) {
    const { answer } = await ask(fetchImpl, 'deactivate', { license_key: held.key, instance_id: held.instance }, api);
    if (!answer?.deactivated && !/not found|invalid/i.test(String(answer?.error ?? ''))) throw new Error(t('Lemon Squeezy did not release the license: {error}', { error: String(answer?.error ?? '').slice(0, 200) || t('no reason given') }));
  }
  delete licenses[id];
  await keep(stateRoot, licenses);
  return { id };
}
