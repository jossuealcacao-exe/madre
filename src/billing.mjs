// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE App's subscription (2026-11-17, docs/private/SUSCRIPCION.md §12). Off everywhere except inside
// the desktop app (MADRE_APP=1), and there only once the author turns it on with a switch signed on
// their computer (the notices' key, src/notices-key.mjs) and served by madre.run. Then each copy gets
// seven days with everything, and after them a subscription (a key madre.run signs once Stripe says it
// was paid, src/billing-key.mjs) or the limited mode: one project takes messages, no plans among
// several AIs, no Coordinator. Never a lock and never a deletion: what is past the limit stays, to be
// read. MADRE from npm or from source never sees any of this.
//
// Kept in ~/.pulse/suscripcion/: interruptor.json (the last switch, as signed), estado.json (when this
// copy's trial began, the order waiting to be paid, the project chosen in the limited mode, what the
// person has already been told) and clave (the key, readable only by its owner).

import { createPrivateKey, createPublicKey, randomBytes, sign, verify } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BILLING_PUBLIC_KEY } from './billing-key.mjs';
import { NOTICES_PUBLIC_KEY } from './notices-key.mjs';

export const BILLING_SITE = 'https://madre.run';
export const billingSite = (env = process.env) => String(env.PULSE_COBRO_URL || BILLING_SITE).replace(/\/+$/, '');
export const billingInApp = (env = process.env) => env.MADRE_APP === '1';

const DAY = 24 * 60 * 60 * 1000;
// How often a copy asks madre.run for the switch, for a key it is waiting for, and for a fresh key.
export const SWITCH_EVERY_MS = 30 * 60 * 1000;
export const ORDER_EVERY_MS = 4000;
export const RENEW_EVERY_MS = 12 * 60 * 60 * 1000;
// The project that takes messages in the limited mode changes once a day at most.
export const CHOOSE_EVERY_MS = DAY;
// Settings › Subscription offers the plan; the price comes signed in the switch.
export const PLAN = 'mensual';

const isDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const ORDER = /^[A-Za-z0-9_-]{43}$/;

function checks(bytes, signature, publicKey) {
  if (!publicKey) return false;
  try { return verify(null, bytes, createPublicKey(publicKey), Buffer.from(String(signature ?? ''), 'base64')); } catch { return false; }
}

// ---- The author's switch -------------------------------------------------------------------------

// Read as MADRE reads it, or null: on or off, since when, how many days of trial, the monthly price.
export function readSwitch(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.on !== 'boolean' || !isDate(raw.from) || !isDate(raw.at)) return null;
  const trialDays = Number(raw.trialDays);
  const mxn = Number(raw.price?.mxn);
  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 30 || !Number.isFinite(mxn) || mxn <= 0) return null;
  return { on: raw.on, from: raw.from, trialDays, price: { mxn }, at: raw.at };
}
// The exact bytes signed: a word of its own, so no notice's signature ever passes for a switch.
export const switchBytes = (one) => Buffer.from(`madre-cobro:${JSON.stringify({ on: one.on, from: one.from, trialDays: one.trialDays, price: { mxn: one.price.mxn }, at: one.at })}`);
export function signSwitch(raw, privateKeyPem) {
  const one = readSwitch(raw);
  if (!one) throw new Error('That is not a switch MADRE would read.');
  return { switch: one, sig: sign(null, switchBytes(one), createPrivateKey(privateKeyPem)).toString('base64') };
}
export function verifiedSwitch(entry, publicKey = NOTICES_PUBLIC_KEY) {
  const one = readSwitch(entry?.switch);
  return one && checks(switchBytes(one), entry.sig, publicKey) ? one : null;
}

// ---- The key -------------------------------------------------------------------------------------

// MADRE1.<payload>.<signature>, both base64url; the signature is over «madre-clave:» and the payload's
// JSON exactly as it travels. Null when anything about it does not hold.
export function readKey(text, publicKey = BILLING_PUBLIC_KEY) {
  const parts = String(text ?? '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'MADRE1' || !BASE64URL.test(parts[1]) || !BASE64URL.test(parts[2])) return null;
  const json = Buffer.from(parts[1], 'base64url').toString('utf8');
  if (!checks(Buffer.from(`madre-clave:${json}`), Buffer.from(parts[2], 'base64url').toString('base64'), publicKey)) return null;
  let payload;
  try { payload = JSON.parse(json); } catch { return null; }
  if (payload?.v !== 1 || typeof payload.sub !== 'string' || !payload.sub || !isDate(payload.until) || !isDate(payload.at)) return null;
  return { sub: payload.sub, plan: typeof payload.plan === 'string' ? payload.plan : PLAN, until: payload.until, at: payload.at };
}
// The same format madre.run signs (its tests, and these).
export function signKey({ sub, plan = PLAN, until, at = new Date().toISOString() }, privateKeyPem) {
  const json = JSON.stringify({ v: 1, sub, plan, until, at });
  return `MADRE1.${Buffer.from(json).toString('base64url')}.${sign(null, Buffer.from(`madre-clave:${json}`), createPrivateKey(privateKeyPem)).toString('base64url')}`;
}

// ---- What this copy keeps ------------------------------------------------------------------------

const folder = (root) => join(root, 'suscripcion');
const readJson = (file) => readFile(file, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
async function writeAtomic(file, text, mode = 0o600) {
  await mkdir(join(file, '..'), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, text, { mode });
  await rename(temp, file).catch(async (error) => { await rm(temp, { force: true }); throw error; });
  await chmod(file, mode).catch(() => {});
}

export async function readBilling(root, { switchKey, billingKey } = {}) {
  switchKey ??= NOTICES_PUBLIC_KEY;
  billingKey ??= BILLING_PUBLIC_KEY;
  const served = await readJson(join(folder(root), 'interruptor.json'));
  const saved = (await readJson(join(folder(root), 'estado.json'))) ?? {};
  const keyText = (await readFile(join(folder(root), 'clave'), 'utf8').catch(() => '')).trim();
  return { sw: verifiedSwitch(served, switchKey), served, saved, key: keyText ? readKey(keyText, billingKey) : null, keyText };
}
export async function saveBilling(root, patch) {
  const saved = { ...((await readJson(join(folder(root), 'estado.json'))) ?? {}), ...patch };
  for (const [name, value] of Object.entries(patch)) if (value === undefined) delete saved[name];
  await writeAtomic(join(folder(root), 'estado.json'), `${JSON.stringify(saved, null, 2)}\n`);
  return saved;
}

// Where this copy stands. `off`: outside the app, or the author has not turned it on. `trial`: days
// left. `active`: paid, until when. `limited`: the trial is over and there is no live key.
export function billingState({ env = process.env, sw, saved = {}, key = null, now = Date.now() }) {
  if (!billingInApp(env) || !sw?.on || now < Date.parse(sw.from)) return { state: 'off' };
  const trialStart = isDate(saved.trial) ? Date.parse(saved.trial) : now;
  const trialEnds = trialStart + sw.trialDays * DAY;
  const live = key && Date.parse(key.until) > now;
  const base = { price: sw.price, trialDays: sw.trialDays, trialEnds: new Date(trialEnds).toISOString(), waiting: Boolean(saved.order && !live) };
  if (live) return { ...base, state: 'active', until: key.until, plan: key.plan };
  if (now < trialEnds) return { ...base, state: 'trial', daysLeft: Math.max(1, Math.ceil((trialEnds - now) / DAY)) };
  return { ...base, state: 'limited', active: saved.active ?? null, lapsed: Boolean(key) };
}

// The state, read from the disk, with the trial started the first time the switch is seen on. The
// author turning it off clears the trial: turned on again later, everyone gets their days again.
export async function loadBilling(root, { env = process.env, now = Date.now(), switchKey, billingKey } = {}) {
  const read = await readBilling(root, { switchKey, billingKey });
  let { saved } = read;
  if (billingInApp(env) && read.sw?.on && now >= Date.parse(read.sw.from) && !isDate(saved.trial)) saved = await saveBilling(root, { trial: new Date(now).toISOString() });
  else if (read.sw && !read.sw.on && (saved.trial || saved.seen)) saved = await saveBilling(root, { trial: undefined, seen: undefined, active: undefined });
  return { ...read, saved, view: billingState({ env, sw: read.sw, saved, key: read.key, now }) };
}

// What the person is told once each, by the page: the switch just reached them, two days left, the
// last day, the trial over, and the thank-you once paid.
export function dueMoment(view, saved = {}) {
  const seen = saved.seen ?? {};
  if (view.state === 'trial') {
    if (!seen.intro) return 'intro';
    if (view.daysLeft <= 1 && !seen.last) return 'last';
    if (view.daysLeft <= 2 && !seen.soon && !seen.last) return 'soon';
  }
  if (view.state === 'limited' && !seen.limited) return 'limited';
  if (view.state === 'active' && !seen.paid) return 'paid';
  return null;
}
export const MOMENTS = ['intro', 'soon', 'last', 'limited', 'paid'];
export async function markSeen(root, moment, now = Date.now()) {
  if (!MOMENTS.includes(moment)) return null;
  const { saved } = await readBilling(root);
  return saveBilling(root, { seen: { ...(saved.seen ?? {}), [moment]: new Date(now).toISOString() } });
}

// ---- The limited mode ----------------------------------------------------------------------------

// Whether this project may take a message: the one chosen, or the first one written in once the
// limit began. Any other is read, not written: `active` names the one that is.
export async function claimProject(root, { room, name, view, now = Date.now() }) {
  if (view?.state !== 'limited') return { ok: true };
  const { saved } = await readBilling(root);
  if (!saved.active?.room) {
    const active = { room, name, at: new Date(now).toISOString() };
    await saveBilling(root, { active });
    return { ok: true, active };
  }
  return saved.active.room === room ? { ok: true, active: saved.active } : { ok: false, active: saved.active };
}
// Making another project the one that takes messages: once a day.
export async function chooseProject(root, { room, name, now = Date.now() }) {
  const { saved } = await readBilling(root);
  if (saved.active?.room === room) return { ok: true, active: saved.active };
  const since = isDate(saved.active?.at) ? Date.parse(saved.active.at) : 0;
  if (saved.active?.room && now - since < CHOOSE_EVERY_MS) return { ok: false, active: saved.active, next: new Date(since + CHOOSE_EVERY_MS).toISOString() };
  const active = { room, name, at: new Date(now).toISOString() };
  await saveBilling(root, { active });
  return { ok: true, active };
}

// ---- Talking to madre.run ------------------------------------------------------------------------

const quiet = (ms) => AbortSignal.timeout(ms);

// The switch as madre.run serves it: kept when its signature holds and it is newer than the one here.
export async function askSwitch(root, { env = process.env, fetchImpl = globalThis.fetch, switchKey } = {}) {
  switchKey ??= NOTICES_PUBLIC_KEY;
  const answer = await fetchImpl(`${billingSite(env)}/api/cobro`, { headers: { accept: 'application/json' }, signal: quiet(8000) }).catch(() => null);
  const data = answer?.ok ? await answer.json().catch(() => null) : null;
  if (!data?.switch) return null;
  const one = verifiedSwitch(data, switchKey);
  if (!one) return null;
  const { sw } = await readBilling(root, { switchKey });
  if (!sw || Date.parse(one.at) > Date.parse(sw.at)) await writeAtomic(join(folder(root), 'interruptor.json'), `${JSON.stringify({ switch: data.switch, sig: data.sig })}\n`, 0o644);
  return one;
}

// A new order: the page opens madre.run's payment with it, and this copy asks for its key meanwhile.
export async function newOrder(root, { env = process.env, language = 'es', now = Date.now() } = {}) {
  const id = randomBytes(32).toString('base64url');
  await saveBilling(root, { order: { id, at: new Date(now).toISOString() } });
  return { id, url: `${billingSite(env)}/app/suscribirme/?pedido=${id}&idioma=${language === 'en' ? 'en' : 'es'}` };
}

export async function saveKey(root, text, { billingKey = BILLING_PUBLIC_KEY } = {}) {
  const key = readKey(text, billingKey);
  if (!key) return null;
  await writeAtomic(join(folder(root), 'clave'), `${String(text).trim()}\n`);
  await saveBilling(root, { order: undefined, lapsed: undefined, renewedAt: new Date().toISOString() });
  return key;
}

// The order waiting to be paid: its key once madre.run has it. madre.run does not know an order until
// the browser opens its page (404 meanwhile), and Stripe keeps a payment open for a day: the order is
// asked about for 24 hours, every few seconds in its first half hour (src/server.mjs), then every
// minute. One madre.run says ended (`vencida`: cancelled or never paid) is dropped.
export const ORDER_KEEP_MS = DAY;
export const ORDER_FAST_MS = 30 * 60 * 1000;
export async function askOrder(root, { env = process.env, fetchImpl = globalThis.fetch, billingKey = BILLING_PUBLIC_KEY, now = Date.now() } = {}) {
  const { saved } = await readBilling(root, { billingKey });
  if (!ORDER.test(saved.order?.id ?? '')) return null;
  const answer = await fetchImpl(`${billingSite(env)}/api/suscripcion/clave?pedido=${saved.order.id}`, { headers: { accept: 'application/json' }, signal: quiet(8000) }).catch(() => null);
  const data = answer?.ok ? await answer.json().catch(() => null) : null;
  if (data?.estado === 'activa' && data.clave) return saveKey(root, data.clave, { billingKey });
  const age = now - (isDate(saved.order.at) ? Date.parse(saved.order.at) : 0);
  if (data?.estado === 'vencida' || age > ORDER_KEEP_MS) await saveBilling(root, { order: undefined });
  return null;
}

// A fresh key for the one here, every twelve hours: `until` moves with each payment. A subscription
// that ended keeps its old key until it expires on its own.
export async function renewKey(root, { env = process.env, fetchImpl = globalThis.fetch, billingKey = BILLING_PUBLIC_KEY, now = Date.now(), force = false } = {}) {
  const { keyText, key, saved } = await readBilling(root, { billingKey });
  if (!key) return null;
  const last = isDate(saved.renewedAt) ? Date.parse(saved.renewedAt) : 0;
  if (!force && now - last < RENEW_EVERY_MS && Date.parse(key.until) - now > 3 * DAY) return key;
  const answer = await fetchImpl(`${billingSite(env)}/api/suscripcion/renovar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave: keyText }), signal: quiet(8000) }).catch(() => null);
  const data = answer?.ok ? await answer.json().catch(() => null) : null;
  if (data?.estado === 'activa' && data.clave) return (await saveKey(root, data.clave, { billingKey })) ?? key;
  if (data?.estado === 'vencida') await saveBilling(root, { renewedAt: new Date(now).toISOString(), lapsed: true });
  return key;
}

// Where the person cancels, changes the card or reads the invoices: Stripe's own page, opened by
// madre.run for this key.
export async function portalUrl(root, { env = process.env, fetchImpl = globalThis.fetch, language = 'es' } = {}) {
  const { keyText } = await readBilling(root);
  if (!keyText) return null;
  const answer = await fetchImpl(`${billingSite(env)}/api/suscripcion/portal`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave: keyText, idioma: language === 'en' ? 'en' : 'es' }), signal: quiet(10000) }).catch(() => null);
  const data = answer?.ok ? await answer.json().catch(() => null) : null;
  return typeof data?.url === 'string' && /^https:\/\//.test(data.url) ? data.url : null;
}
