// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// THE MARKET, from madre.run (2026-10-18). What the Market shows and the modules it hands out do
// not wait for a new MADRE: they live in a catalog the author publishes at madre.run/mercado/,
// signed with a key only the author holds (scripts/market-key.mjs). MADRE reads it when it opens —
// at most every ten minutes, however many projects open at once — and keeps the last one it could
// verify, so the Market works without internet with what it knew.
//
//   catalogo.json      the catalog: shelves, the featured order, and one entry per module — the
//                      words and drawings of MADRE's own, and for a new module its file, pinned by
//                      its sha256 and size.
//   catalogo.json.sig  the Ed25519 signature of those exact bytes, in base64.
//
// A catalog the key does not verify is not read. A module file whose sha256 is not the one the
// signed catalog names is not installed. A catalog older than the one already kept is refused, so
// an old signed catalog cannot be served again to roll a module back. What a module may do once
// installed is the same as any module installed by hand: the checks of src/modules/index.mjs.
//
// A module got from the Market is remembered in market/installed.json. When the catalog names a
// newer file for it, MADRE installs that one on its own and says so, once, in the room (the author
// signed it; the person chose the module). A module installed by hand is never touched.

import { createHash, createPublicKey, verify } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { t } from './i18n.mjs';
import { MARKET_PUBLIC_KEY } from './market-key.mjs';
import { mayInstall } from './market-license.mjs';

export const MARKET_URL = 'https://madre.run/mercado/catalogo.json';
const MAX_CATALOG = 1024 * 1024;
const MAX_SIGNATURE = 1024;
const MAX_MODULE = 512 * 1024;
const FRESH_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;
const ID = /^[a-z][a-z0-9-]{1,40}$/;
const SHA = /^[0-9a-f]{64}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

export const marketUrl = (env = process.env) => env.PULSE_MARKET_URL || MARKET_URL;
const folder = (stateRoot) => join(stateRoot, 'market');
const readJson = (file) => readFile(file, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
async function writeAtomic(file, data) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, data);
  await rename(temp, file);
}

export function verifySigned(bytes, signature, publicKeyPem = MARKET_PUBLIC_KEY) {
  try { return verify(null, Buffer.from(bytes), createPublicKey(publicKeyPem), Buffer.from(String(signature ?? '').trim(), 'base64')); } catch { return false; }
}
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// MADRE's version against what a module asks for: «1.0.3» ≥ «1.0.2».
export function fitsVersion(have, need) {
  if (!need) return true;
  const parts = (value) => String(value).replace(/^v/, '').split(/[.-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parts(have), parts(need)];
  for (let at = 0; at < 3; at += 1) if (a[at] !== b[at]) return a[at] > b[at];
  return true;
}

// Words in both languages, or one for both. Anything else is dropped.
const words = (value, max = 400) => {
  if (typeof value === 'string') return value.slice(0, max);
  if (!value || typeof value !== 'object') return null;
  const out = {};
  for (const lang of ['en', 'es']) if (typeof value[lang] === 'string') out[lang] = value[lang].slice(0, max);
  return Object.keys(out).length ? out : null;
};
// The address a module file may come from: https, on the catalog's own host (a local catalog,
// for a test, may name its own local files).
function fileUrl(raw, catalogUrl) {
  let url;
  let base;
  try { url = new URL(raw, catalogUrl); base = new URL(catalogUrl); } catch { return null; }
  if (url.host !== base.host) return null;
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return null;
  return url.href;
}

// The catalog, read whole or not at all where it matters (its shape), entry by entry where it
// does not (an entry MADRE cannot read is left out, so a newer catalog still works here).
export function readCatalog(text, { url = MARKET_URL } = {}) {
  const data = JSON.parse(text);
  if (data?.schema !== 1 || !Array.isArray(data.modules)) throw new Error(t('This is not a Market catalog MADRE can read.'));
  const issued = Date.parse(data.issued);
  if (!Number.isFinite(issued)) throw new Error(t('The Market catalog does not say when it was made.'));
  const shelves = (Array.isArray(data.shelves) ? data.shelves : []).filter((shelf) => ID.test(shelf?.id ?? '')).map((shelf) => ({ id: shelf.id, title: words(shelf.title, 80), about: words(shelf.about, 200) })).slice(0, 20);
  const modules = [];
  for (const raw of data.modules.slice(0, 200)) {
    if (!ID.test(raw?.id ?? '')) continue;
    const entry = {
      id: raw.id,
      shelf: ID.test(raw.shelf ?? '') ? raw.shelf : null,
      scope: raw.scope === 'project' ? 'project' : 'everywhere',
      price: Number.isFinite(raw.price) && raw.price >= 0 ? raw.price : 0,
      name: words(raw.name, 60),
      line: words(raw.line, 140),
      pitch: words(raw.pitch, 240),
      summary: words(raw.summary, 1200),
      hue: Array.isArray(raw.hue) && raw.hue.length === 2 && raw.hue.every((one) => COLOR.test(one)) ? raw.hue : null,
      // Drawings are markup: they travel signed, and the page keeps only the shapes it knows (market.js).
      icon: typeof raw.icon === 'string' && raw.icon.length <= 8000 ? raw.icon : null,
      art: typeof raw.art === 'string' && raw.art.length <= 60000 ? raw.art : null,
      // Two more pictures for its page (1.0.5), drawings like `art`.
      shots: Array.isArray(raw.shots) ? raw.shots.filter((one) => typeof one === 'string' && one.length <= 60000).slice(0, 2) : [],
      version: typeof raw.version === 'string' && /^\d+\.\d+\.\d+$/.test(raw.version) ? raw.version : null,
      minMadre: typeof raw.minMadre === 'string' && /^\d+\.\d+\.\d+$/.test(raw.minMadre) ? raw.minMadre : null,
      changes: words(raw.changes, 400),
      file: null,
      // Where a paid module is bought (an https page) and whose license opens it (market-license.mjs).
      checkout: null,
      license: null,
    };
    if (entry.price > 0) {
      try { const page = new URL(raw.checkout); if (page.protocol === 'https:') entry.checkout = page.href; } catch { /* no page to buy it */ }
      if (raw.license?.provider === 'lemonsqueezy' && Number.isInteger(raw.license.store) && Number.isInteger(raw.license.product)) entry.license = { provider: 'lemonsqueezy', store: raw.license.store, product: raw.license.product };
    }
    if (raw.file) {
      const href = fileUrl(raw.file.url, url);
      if (!href || !SHA.test(raw.file.sha256 ?? '') || !entry.version) continue;
      entry.file = { url: href, sha256: raw.file.sha256, size: Number(raw.file.size) || null };
    }
    modules.push(entry);
  }
  const featured = (Array.isArray(data.featured) ? data.featured : []).filter((id) => modules.some((one) => one.id === id)).slice(0, 8);
  // What the author has to say to everyone who opens MADRE: one line each, said once, and the
  // module it is about when there is one.
  const news = (Array.isArray(data.news) ? data.news : []).filter((one) => ID.test(one?.id ?? '')).map((one) => ({ id: one.id, text: words(one.text, 240), module: ID.test(one.module ?? '') ? one.module : null })).filter((one) => one.text).slice(0, 10);
  return { schema: 1, issued: new Date(issued).toISOString(), shelves, featured, modules, news };
}

async function bytesFrom(url, { fetchImpl, max }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { accept: 'application/json, text/javascript, */*' } });
    if (!response.ok) throw new Error(`${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > max) throw new Error('too large');
    return buffer;
  } finally { clearTimeout(timer); }
}

// The catalog kept on this computer, checked again before it is believed.
export async function keptCatalog({ stateRoot, publicKey = MARKET_PUBLIC_KEY } = {}) {
  const [bytes, signature, state] = await Promise.all([readFile(join(folder(stateRoot), 'catalogo.json')).catch(() => null), readFile(join(folder(stateRoot), 'catalogo.json.sig'), 'utf8').catch(() => null), readJson(join(folder(stateRoot), 'state.json'))]);
  if (!bytes || !signature || !verifySigned(bytes, signature, publicKey)) return null;
  try { return readCatalog(bytes.toString('utf8'), { url: state?.url ?? MARKET_URL }); } catch { return null; }
}

// Ask madre.run for the catalog. Answers with the newest one this computer can trust, and why it
// is not newer when it could not be.
export async function refreshCatalog({ stateRoot, env = process.env, fetchImpl = globalThis.fetch, publicKey = MARKET_PUBLIC_KEY, force = false, now = Date.now } = {}) {
  const dir = folder(stateRoot);
  const state = (await readJson(join(dir, 'state.json'))) ?? {};
  const kept = await keptCatalog({ stateRoot, publicKey });
  if (!force && kept && state.checkedAt && now() - Date.parse(state.checkedAt) < FRESH_MS) return { catalog: kept, fresh: false };
  const url = marketUrl(env);
  try {
    const [bytes, signature] = await Promise.all([bytesFrom(url, { fetchImpl, max: MAX_CATALOG }), bytesFrom(`${url}.sig`, { fetchImpl, max: MAX_SIGNATURE })]);
    if (!verifySigned(bytes, signature.toString('utf8'), publicKey)) throw new Error(t('The Market catalog is not signed with MADRE\'s key, so MADRE did not read it.'));
    const catalog = readCatalog(bytes.toString('utf8'), { url });
    if (kept && Date.parse(catalog.issued) < Date.parse(kept.issued)) throw new Error(t('The Market served a catalog older than the one this computer has, so MADRE kept its own.'));
    await mkdir(dir, { recursive: true });
    await writeAtomic(join(dir, 'catalogo.json'), bytes);
    await writeAtomic(join(dir, 'catalogo.json.sig'), signature);
    await writeAtomic(join(dir, 'state.json'), JSON.stringify({ url, checkedAt: new Date(now()).toISOString(), issued: catalog.issued }, null, 2));
    return { catalog, fresh: true };
  } catch (error) {
    await mkdir(dir, { recursive: true }).catch(() => {});
    await writeAtomic(join(dir, 'state.json'), JSON.stringify({ ...state, url: state.url ?? url, checkedAt: new Date(now()).toISOString(), failed: error.name === 'AbortError' ? 'timeout' : String(error.message).slice(0, 200) }, null, 2)).catch(() => {});
    return { catalog: kept, fresh: false, error: error.name === 'AbortError' ? 'timeout' : error.message };
  }
}

export const installedFromMarket = async (stateRoot) => (await readJson(join(folder(stateRoot), 'installed.json'))) ?? {};

// One module from the catalog onto this computer, for every project (each one turns it on).
// `verify` and `install` are src/modules/index.mjs's own checks and writer.
export async function installFromMarket({ stateRoot, projectRoot, id, catalog, madre, fetchImpl = globalThis.fetch, verifyText, installText }) {
  const entry = catalog?.modules.find((one) => one.id === id && one.file);
  if (!entry) throw new Error(t('The Market has no module «{id}» to install.', { id }));
  if (!fitsVersion(madre, entry.minMadre)) throw new Error(t('This module needs MADRE {version} or newer.', { version: entry.minMadre }));
  if (!(await mayInstall(stateRoot, entry))) throw new Error(t('«{name}» is a paid module: buy it, or activate the license you already have.', { name: entry.id }));
  const bytes = await bytesFrom(entry.file.url, { fetchImpl, max: MAX_MODULE });
  if (sha256(bytes) !== entry.file.sha256) throw new Error(t('The module file is not the one the Market signed, so MADRE did not install it.'));
  const text = bytes.toString('utf8');
  const checked = await verifyText({ text, name: `${id}.mjs`, replace: true });
  if (checked.id !== id) throw new Error(t('The file says it is «{found}», not «{id}», so MADRE did not install it.', { found: checked.id, id }));
  const done = await installText({ text, name: `${id}.mjs`, scope: 'user', stateRoot, projectRoot, source: { kind: 'market', from: entry.file.url }, replace: true });
  const dir = folder(stateRoot);
  await mkdir(dir, { recursive: true });
  const installed = await installedFromMarket(stateRoot);
  installed[id] = { version: entry.version, sha256: entry.file.sha256, at: new Date().toISOString() };
  await writeAtomic(join(dir, 'installed.json'), JSON.stringify(installed, null, 2));
  return { ...done, version: entry.version };
}

// A module removed by hand is no longer the Market's to update: it is forgotten here too, or the
// next catalog would bring it back.
export async function forgetFromMarket(stateRoot, id) {
  const installed = await installedFromMarket(stateRoot);
  if (!installed[id]) return false;
  delete installed[id];
  await writeAtomic(join(folder(stateRoot), 'installed.json'), JSON.stringify(installed, null, 2));
  return true;
}

// THE MARKET'S NEWS, told once to each computer: what the author wrote in the catalog, and every
// module that arrived in it that this computer does not have. Kept in market/announced.json.
export async function marketAnnouncements(stateRoot, catalog, have = []) {
  if (!catalog) return { news: [], modules: [] };
  const told = new Set((await readJson(join(folder(stateRoot), 'announced.json'))) ?? []);
  return {
    news: (catalog.news ?? []).filter((one) => !told.has(`news:${one.id}`)),
    modules: catalog.modules.filter((one) => one.file && !have.includes(one.id) && !told.has(`module:${one.id}`)).map(({ id, name, line }) => ({ id, name, line })),
  };
}
export async function marketAnnounced(stateRoot, keys = []) {
  const told = new Set((await readJson(join(folder(stateRoot), 'announced.json'))) ?? []);
  for (const key of keys) if (/^(news|module):[a-z][a-z0-9-]{1,40}$/.test(String(key))) told.add(key);
  await mkdir(folder(stateRoot), { recursive: true });
  await writeAtomic(join(folder(stateRoot), 'announced.json'), JSON.stringify([...told].slice(-500)));
}

// What the Market updated on its own and the person has not been told yet.
export const marketNews = async (stateRoot) => (await readJson(join(folder(stateRoot), 'updates.json'))) ?? [];
export async function marketNewsSeen(stateRoot) { await writeAtomic(join(folder(stateRoot), 'updates.json'), '[]').catch(() => {}); }

// Every module got from the Market whose signed file changed: the new one, installed, and a line
// for the person. One that fails stays as it was and is tried again next time.
export async function updateFromMarket({ stateRoot, projectRoot, catalog, madre, fetchImpl = globalThis.fetch, verifyText, installText, names = {} }) {
  const installed = await installedFromMarket(stateRoot);
  const updated = [];
  for (const [id, have] of Object.entries(installed)) {
    const entry = catalog?.modules.find((one) => one.id === id && one.file);
    if (!entry || entry.file.sha256 === have.sha256 || !fitsVersion(madre, entry.minMadre)) continue;
    try {
      await installFromMarket({ stateRoot, projectRoot, id, catalog, madre, fetchImpl, verifyText, installText });
      updated.push({ id, name: names[id] ?? (typeof entry.name === 'string' ? entry.name : entry.name?.en) ?? id, from: have.version ?? null, to: entry.version, changes: entry.changes ?? null, at: new Date().toISOString() });
    } catch { /* tried again the next time MADRE opens */ }
  }
  if (updated.length) {
    const news = [...(await marketNews(stateRoot)).filter((one) => !updated.some((fresh) => fresh.id === one.id)), ...updated];
    await writeAtomic(join(folder(stateRoot), 'updates.json'), JSON.stringify(news, null, 2));
  }
  return updated;
}
