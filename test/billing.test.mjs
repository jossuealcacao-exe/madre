// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// MADRE App's subscription (2026-11-17, src/billing.mjs, docs/private/SUSCRIPCION.md §12): off outside
// the app and until the author's signed switch says so; seven days with everything; then a key madre.run
// signs, or the limited mode, where nothing is locked or deleted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  askOrder, askSwitch, billingState, chooseProject, claimProject, dueMoment, loadBilling, markSeen, newOrder,
  portalUrl, readKey, renewKey, saveBilling, saveKey, signKey, signSwitch, verifiedSwitch,
} from '../src/billing.mjs';
import { signNotice } from '../src/notices.mjs';

const pair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { priv: privateKey.export({ type: 'pkcs8', format: 'pem' }), pub: publicKey.export({ type: 'spki', format: 'pem' }) };
};
const author = pair();
const site = pair();
const other = pair();
const DAY = 24 * 60 * 60 * 1000;
const APP = { MADRE_APP: '1', PULSE_COBRO_URL: 'https://cobro.test' };
const iso = (ms) => new Date(ms).toISOString();
const switchOn = (now, extra = {}) => signSwitch({ on: true, from: iso(now - 1000), trialDays: 7, price: { mxn: 109 }, at: iso(now - 1000), ...extra }, author.priv);
const house = () => mkdtemp(join(tmpdir(), 'madre-billing-'));
const keep = async (root, served) => { await mkdir(join(root, 'suscripcion'), { recursive: true }); await writeFile(join(root, 'suscripcion', 'interruptor.json'), JSON.stringify(served)); };
const keys = { switchKey: author.pub, billingKey: site.pub };

test('billing: the switch holds only with the author\'s signature, and no notice passes for one', () => {
  const now = Date.now();
  const served = switchOn(now);
  assert.equal(verifiedSwitch(served, author.pub).on, true);
  assert.equal(verifiedSwitch(served, other.pub), null, 'a switch signed by someone else');
  assert.equal(verifiedSwitch({ ...served, switch: { ...served.switch, price: { mxn: 1 } } }, author.pub), null, 'a price changed on the way');
  assert.equal(verifiedSwitch({ ...served, switch: { ...served.switch, on: false } }, author.pub), null, 'turned off on the way');
  // The same key signs the notices: a notice's signature never reads as a switch.
  const notice = signNotice({ id: 'cobro-encendido', level: 'info', title: { es: 'Hola', en: 'Hi' }, body: { es: 'Hola', en: 'Hi' }, link: null, to: { min: null, max: null, os: [] }, from: iso(now), until: iso(now + DAY) }, author.priv);
  assert.equal(verifiedSwitch({ switch: served.switch, sig: notice.sig }, author.pub), null);
  assert.throws(() => signSwitch({ on: 'yes', from: iso(now), trialDays: 7, price: { mxn: 109 }, at: iso(now) }, author.priv));
});

test('billing: a key reads only whole and signed by madre.run', () => {
  const until = iso(Date.now() + 30 * DAY);
  const text = signKey({ sub: 'sub-1', until }, site.priv);
  assert.match(text, /^MADRE1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual({ ...readKey(text, site.pub), at: null }, { sub: 'sub-1', plan: 'mensual', until, at: null });
  assert.equal(readKey(text, other.pub), null, 'signed by someone else');
  assert.equal(readKey(text, null), null, 'no key to check against: nothing is accepted');
  const [head, body, sig] = text.split('.');
  const longer = Buffer.from(Buffer.from(body, 'base64url').toString().replace(until, iso(Date.now() + 900 * DAY))).toString('base64url');
  assert.equal(readKey(`${head}.${longer}.${sig}`, site.pub), null, 'a date moved by hand');
  assert.equal(readKey(`${text}x`, site.pub), null);
  assert.equal(readKey('', site.pub), null);
});

test('billing: off outside the app and before the switch; a trial, a key, or the limited mode', () => {
  const now = Date.now();
  const sw = switchOn(now).switch;
  assert.equal(billingState({ env: {}, sw, now }).state, 'off', 'MADRE from npm or from source');
  assert.equal(billingState({ env: APP, sw: null, now }).state, 'off', 'the author has not turned it on');
  assert.equal(billingState({ env: APP, sw: { ...sw, on: false }, now }).state, 'off');
  assert.equal(billingState({ env: APP, sw: { ...sw, from: iso(now + DAY) }, now }).state, 'off', 'turned on for later');
  const trial = billingState({ env: APP, sw, saved: { trial: iso(now - 2 * DAY) }, now });
  assert.equal(trial.state, 'trial');
  assert.equal(trial.daysLeft, 5);
  assert.deepEqual(trial.price, { mxn: 109 });
  assert.equal(billingState({ env: APP, sw, saved: { trial: iso(now - 7 * DAY + 60000) }, now }).daysLeft, 1);
  const limited = billingState({ env: APP, sw, saved: { trial: iso(now - 8 * DAY) }, now });
  assert.equal(limited.state, 'limited');
  const key = { sub: 's', plan: 'mensual', until: iso(now + DAY), at: iso(now) };
  assert.equal(billingState({ env: APP, sw, saved: { trial: iso(now - 8 * DAY) }, key, now }).state, 'active');
  const lapsed = billingState({ env: APP, sw, saved: { trial: iso(now - 8 * DAY) }, key: { ...key, until: iso(now - 1) }, now });
  assert.equal(lapsed.state, 'limited');
  assert.equal(lapsed.lapsed, true);
});

test('billing: the trial begins the first time the switch is seen on, and the author turning it off gives the days back', async () => {
  const root = await house();
  try {
    const now = Date.now();
    await keep(root, switchOn(now));
    const first = await loadBilling(root, { env: APP, now, ...keys });
    assert.equal(first.view.state, 'trial');
    assert.equal(first.view.daysLeft, 7);
    assert.equal(first.saved.trial, iso(now));
    const later = await loadBilling(root, { env: APP, now: now + 3 * DAY, ...keys });
    assert.equal(later.view.daysLeft, 4, 'the trial started again on a later opening');
    assert.equal((await loadBilling(root, { env: {}, now, ...keys })).view.state, 'off', 'outside the app, nothing');
    await markSeen(root, 'intro');
    await keep(root, signSwitch({ on: false, from: iso(now + DAY), trialDays: 7, price: { mxn: 109 }, at: iso(now + DAY) }, author.priv));
    const off = await loadBilling(root, { env: APP, now: now + DAY, ...keys });
    assert.equal(off.view.state, 'off');
    assert.equal(off.saved.trial, undefined);
    assert.equal(off.saved.seen, undefined, 'turned on again, the person hears of it again');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('billing: each moment is told once — the trial begins, two days left, the last day, the trial over, paid', () => {
  assert.equal(dueMoment({ state: 'off' }, {}), null);
  assert.equal(dueMoment({ state: 'trial', daysLeft: 7 }, {}), 'intro');
  assert.equal(dueMoment({ state: 'trial', daysLeft: 7 }, { seen: { intro: 'x' } }), null);
  assert.equal(dueMoment({ state: 'trial', daysLeft: 2 }, { seen: { intro: 'x' } }), 'soon');
  assert.equal(dueMoment({ state: 'trial', daysLeft: 1 }, { seen: { intro: 'x' } }), 'last', 'the last day wins over two days left');
  assert.equal(dueMoment({ state: 'trial', daysLeft: 1 }, { seen: { intro: 'x', last: 'x' } }), null);
  assert.equal(dueMoment({ state: 'limited' }, {}), 'limited');
  assert.equal(dueMoment({ state: 'active' }, {}), 'paid');
  assert.equal(dueMoment({ state: 'active' }, { seen: { paid: 'x' } }), null);
});

test('billing: in the limited mode one project takes messages, chosen again once a day', async () => {
  const root = await house();
  try {
    const now = Date.now();
    const view = { state: 'limited' };
    assert.deepEqual(await claimProject(root, { room: 'a', name: 'Tienda', view: { state: 'trial' }, now }), { ok: true }, 'only the limited mode limits');
    assert.equal((await claimProject(root, { room: 'a', name: 'Tienda', view, now })).ok, true, 'the first one written in');
    assert.equal((await claimProject(root, { room: 'a', name: 'Tienda', view, now })).ok, true);
    const refused = await claimProject(root, { room: 'b', name: 'Blog', view, now });
    assert.equal(refused.ok, false);
    assert.equal(refused.active.name, 'Tienda');
    const soon = await chooseProject(root, { room: 'b', name: 'Blog', now: now + 60000 });
    assert.equal(soon.ok, false, 'changed twice the same day');
    assert.equal(soon.next, iso(now + DAY));
    const moved = await chooseProject(root, { room: 'b', name: 'Blog', now: now + DAY + 1 });
    assert.equal(moved.ok, true);
    assert.equal((await claimProject(root, { room: 'a', name: 'Tienda', view, now: now + DAY + 2 })).ok, false);
    assert.equal((await claimProject(root, { room: 'b', name: 'Blog', view, now: now + DAY + 2 })).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('billing: madre.run is asked for the switch, the key of an order, a fresh key and the portal', async () => {
  const root = await house();
  const now = Date.now();
  const served = { body: switchOn(now) };
  const asked = [];
  let renewed = signKey({ sub: 'sub-9', until: iso(now + 40 * DAY) }, site.priv);
  const fetchImpl = async (url, options = {}) => {
    const where = new URL(url);
    asked.push(`${options.method ?? 'GET'} ${where.pathname}`);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (where.pathname === '/api/cobro') return json(200, served.body);
    if (where.pathname === '/api/suscripcion/clave') return where.searchParams.get('pedido') === served.order ? json(200, { estado: 'activa', clave: signKey({ sub: 'sub-9', until: iso(now + 30 * DAY) }, site.priv) }) : json(404, { error: 'unknown' });
    if (where.pathname === '/api/suscripcion/renovar') return json(200, { estado: 'activa', clave: renewed });
    if (where.pathname === '/api/suscripcion/portal') return json(200, { url: 'https://billing.stripe.com/p/session/x' });
    return json(404, {});
  };
  try {
    assert.equal((await askSwitch(root, { env: APP, fetchImpl, switchKey: author.pub })).on, true);
    assert.equal((await loadBilling(root, { env: APP, now, ...keys })).view.state, 'trial');
    // One served without the author's signature is not kept, and an older one never wins.
    served.body = signSwitch({ on: false, from: iso(now), trialDays: 7, price: { mxn: 109 }, at: iso(now) }, other.priv);
    assert.equal(await askSwitch(root, { env: APP, fetchImpl, switchKey: author.pub }), null);
    served.body = signSwitch({ on: false, from: iso(now - DAY), trialDays: 7, price: { mxn: 109 }, at: iso(now - DAY) }, author.priv);
    await askSwitch(root, { env: APP, fetchImpl, switchKey: author.pub });
    assert.equal((await loadBilling(root, { env: APP, now, ...keys })).view.state, 'trial', 'an older switch replaced a newer one');

    const order = await newOrder(root, { env: APP, language: 'es', now });
    assert.match(order.id, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(order.url, `https://cobro.test/app/suscribirme/?pedido=${order.id}&idioma=es`);
    served.order = order.id;
    const key = await askOrder(root, { env: APP, fetchImpl, billingKey: site.pub });
    assert.equal(key.sub, 'sub-9');
    const after = await loadBilling(root, { env: APP, now, ...keys });
    assert.equal(after.view.state, 'active');
    assert.equal(after.saved.order, undefined, 'the order stays waiting once paid');
    assert.equal(((await readFile(join(root, 'suscripcion', 'clave'), 'utf8')).trim()).startsWith('MADRE1.'), true);

    // Renewed every twelve hours: the new `until` replaces the old.
    await saveBilling(root, { renewedAt: iso(now - 13 * 60 * 60 * 1000) });
    assert.equal((await renewKey(root, { env: APP, fetchImpl, billingKey: site.pub, now })).until, iso(now + 40 * DAY));
    // Ended: the old key stays until it expires on its own.
    renewed = null;
    const ended = async (url, options) => (new URL(url).pathname === '/api/suscripcion/renovar' ? { ok: true, status: 200, json: async () => ({ estado: 'vencida' }) } : fetchImpl(url, options));
    assert.equal((await renewKey(root, { env: APP, fetchImpl: ended, billingKey: site.pub, now, force: true })).until, iso(now + 40 * DAY));
    assert.equal((await loadBilling(root, { env: APP, now, ...keys })).saved.lapsed, true);

    assert.equal(await portalUrl(root, { env: APP, fetchImpl }), 'https://billing.stripe.com/p/session/x');
    assert.equal(await portalUrl(root, { env: APP, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ url: 'javascript:alert(1)' }) }) }), null, 'only an https address opens');
    assert.equal(await saveKey(root, 'MADRE1.nada.nada', { billingKey: site.pub }), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('billing: an order is asked about for a day — madre.run does not know it until the browser opens its page — and dropped once ended', async () => {
  const root = await house();
  try {
    const now = Date.now();
    const unknown = async () => ({ ok: false, status: 404, json: async () => ({ error: 'unknown' }) });
    await newOrder(root, { env: APP, now });
    await askOrder(root, { env: APP, fetchImpl: unknown, billingKey: site.pub, now: now + 5000 });
    assert.ok((await loadBilling(root, { env: APP, ...keys })).saved.order, 'dropped before the browser opened the payment');
    await askOrder(root, { env: APP, fetchImpl: unknown, billingKey: site.pub, now: now + DAY + 1 });
    assert.equal((await loadBilling(root, { env: APP, ...keys })).saved.order, undefined, 'asked about forever');
    await newOrder(root, { env: APP, now });
    await askOrder(root, { env: APP, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ estado: 'vencida' }) }), billingKey: site.pub, now: now + 60000 });
    assert.equal((await loadBilling(root, { env: APP, ...keys })).saved.order, undefined, 'a cancelled payment kept being asked about');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('billing: in the limited mode the room makes no plan among several AIs', async () => {
  const room = await readFile(new URL('../src/room.mjs', import.meta.url), 'utf8');
  assert.match(room, /const mayDelegate = allowDelegation && this\.#delegation && depth === 0 && this\.#plansAllowed\(\);/);
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /plansAllowed: \(\) => billingView\(\)\.state !== 'limited',/);
});

test('billing · the routes: a price only inside the app with the switch on; a limit is a card with its way out', async () => {
  const { createPulseServer, projectRoomId } = await import('../src/server.mjs');
  const { realpath } = await import('node:fs/promises');
  const state = await house();
  const project = await realpath(await mkdtemp(join(tmpdir(), 'madre-billing-project-')));
  const saved = { app: process.env.MADRE_APP, terms: process.env.PULSE_TERMS, site: process.env.PULSE_COBRO_URL };
  process.env.PULSE_TERMS = 'accepted';
  process.env.PULSE_COBRO_URL = 'http://127.0.0.1:9';
  delete process.env.MADRE_APP;
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, billingKeys: keys }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const get = async () => (await fetch(`${base}/api/subscription`)).json();
    const post = (path, payload = {}, headers = { origin: base }) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    const now = Date.now();
    await keep(state, switchOn(now));

    assert.equal((await get()).state, 'off', 'MADRE from npm or from source never shows a price');
    assert.equal((await post('/api/subscription/subscribe')).status, 409);
    process.env.MADRE_APP = '1';
    const trial = await get();
    assert.equal(trial.state, 'trial');
    assert.equal(trial.moment, 'intro');
    assert.deepEqual(trial.price, { mxn: 109 });
    assert.equal(trial.project.room, projectRoomId(project));
    assert.equal((await post('/api/subscription/seen', { moment: 'intro' }, {})).status, 403, 'changed by a process with no page');
    assert.equal((await (await post('/api/subscription/seen', { moment: 'intro' })).json()).moment, null);
    assert.equal((await fetch(`${base}/api/subscription`, { headers: { 'x-madre-device': 'phone-1' } })).status, 404, 'a phone');

    const ordered = await (await post('/api/subscription/subscribe')).json();
    assert.match(ordered.url, /^http:\/\/127\.0\.0\.1:9\/app\/suscribirme\/\?pedido=[A-Za-z0-9_-]{43}&idioma=(es|en)$/);
    assert.equal((await get()).waiting, true);

    // The trial over: the limited mode, told once.
    await saveBilling(state, { trial: iso(now - 8 * DAY), order: undefined, active: { room: 'otro', name: 'Tienda', at: iso(now) } });
    const limited = await get();
    assert.equal(limited.state, 'limited');
    assert.equal(limited.moment, 'limited');
    const refused = await post('/api/messages', { text: 'hola' });
    assert.equal(refused.status, 402);
    const said = await refused.json();
    assert.equal(said.subscription.limit, 'project');
    assert.equal(said.subscription.active.name, 'Tienda');
    assert.equal((await post('/api/subscription/project')).status, 409, 'changed twice the same day');
    await saveBilling(state, { active: { room: 'otro', name: 'Tienda', at: iso(now - 2 * DAY) } });
    const chosen = await (await post('/api/subscription/project')).json();
    assert.equal(chosen.active.room, projectRoomId(project));
    assert.notEqual((await post('/api/messages', { text: 'hola' })).status, 402, 'the project chosen takes messages');

    // Paid on another computer: the key pasted here.
    assert.equal((await post('/api/subscription/key', { key: 'MADRE1.a.b' })).status, 422);
    const paid = await (await post('/api/subscription/key', { key: signKey({ sub: 'sub-1', until: iso(now + 30 * DAY) }, site.priv) })).json();
    assert.equal(paid.state, 'active');
    assert.equal(paid.moment, 'paid');
  } finally {
    for (const [name, value] of [['MADRE_APP', saved.app], ['PULSE_TERMS', saved.terms], ['PULSE_COBRO_URL', saved.site]]) if (value === undefined) delete process.env[name]; else process.env[name] = value;
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

// 2026-11-18, the author: «Van a ser 30 días gratis y después el precio de la suscripción».
test('billing · the author\'s switch gives thirty days with everything, then $109 MXN a month', async () => {
  const billing = await import('../src/billing.mjs');
  assert.equal(billing.TRIAL_DAYS, 30);
  assert.equal(billing.PRICE_MXN, 109);
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /signSwitch\(\{ on: payload\.on, from: at, trialDays: TRIAL_DAYS, price: \{ mxn: PRICE_MXN \}, at \}/, 'the switch is signed with other days or another price');
  // Thirty days is still within what a copy accepts, and the count starts at thirty.
  const now = Date.parse('2026-11-18T12:00:00Z');
  const sw = { on: true, from: new Date(now - 1000).toISOString(), trialDays: billing.TRIAL_DAYS, price: { mxn: billing.PRICE_MXN }, at: new Date(now - 1000).toISOString() };
  assert.equal(billing.billingState({ env: { MADRE_APP: '1' }, sw, saved: { trial: new Date(now).toISOString() }, now }).daysLeft, 30);
});
