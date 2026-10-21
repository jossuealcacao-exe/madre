// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The bridge: the one thing on this Mac a phone can reach (docs/MOBILE.md, MOV-001).
//
// Rooms keep listening on 127.0.0.1 and keep refusing anything that does not call them by that
// name (src/request-guard.mjs). The bridge listens on the local network, lets in only a phone that
// was paired with a QR, and passes its requests on to the room it chose, as 127.0.0.1, under the
// phone's policy (policy.mjs). The room's own page is served as it is: the room it belongs to is
// picked by a cookie, so every absolute path in it keeps working behind the bridge.
//
// Before anything else a request has to come from a private address and name this Mac by one of
// its own names. Everything a phone sends that changes something has to come from the bridge's own
// pages. A phone that is not paired gets a page that says how to pair it, and nothing else.

import http from 'node:http';
import { hostname } from 'node:os';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { language, t } from '../i18n.mjs';
import { readHandoff } from './handoff.mjs';
import { deviceForToken, readStore, redeemInvite } from './devices.mjs';
import { isPrivateAddress, lanAddresses } from './network.mjs';
import { inspects, phonePolicy } from './policy.mjs';
import { salasRoomId } from '../salas.mjs';

export const BRIDGE_PORT = 4316;
const PHONE_COOKIE = 'madre_phone';
const ROOM_COOKIE = 'madre_room';
const MONTH_S = 30 * 24 * 60 * 60;
const MESSAGE_LIMIT = 1024 * 1024;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
// The bridge's own files, served from the package of the room that hosts it.
const OWN = { '/salas': 'salas.html', '/bridge/salas.js': 'salas.js', '/bridge/salas.css': 'salas.css', '/bridge/styles.css': 'styles.css', '/bridge/i18n.js': 'i18n.js', '/bridge/es.js': 'es.js', '/bridge/en.js': 'en.js', '/bridge/touch.js': 'touch.js', '/bridge/manifest.webmanifest': 'manifest.webmanifest' };
const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'cookie', 'origin', 'referer']);

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

// Every room open on this Mac, from the marks the rooms leave (src/server.mjs, open.json).
export async function roomsOnThisMac(root) {
  const dir = join(root, 'rooms');
  const names = await readdir(dir).catch(() => []);
  const out = [];
  for (const id of names) {
    const mark = await readFile(join(dir, id, 'open.json'), 'utf8').then((raw) => JSON.parse(raw)).catch(() => null);
    if (!mark || !Number.isInteger(mark.pid) || !Number.isInteger(mark.port) || mark.port < 1 || mark.port > 65535 || !alive(mark.pid)) continue;
    out.push({ id, port: mark.port, project: typeof mark.project === 'string' ? mark.project : id.replace(/-[0-9a-f]{16}$/, ''), version: mark.version ?? null, at: mark.at ?? null });
  }
  return out.sort((a, b) => a.project.localeCompare(b.project));
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const at = part.indexOf('=');
    if (at < 1) continue;
    const name = part.slice(0, at).trim();
    if (!Object.hasOwn(out, name)) out[name] = decodeURIComponent(part.slice(at + 1).trim());
  }
  return out;
}

const cookie = (name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict`;

// The names a phone may use for this Mac: its addresses on the network, its own name, and loopback.
export function ownHosts(port, { addresses = lanAddresses(), name = hostname() } = {}) {
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  for (const address of addresses) hosts.add(`${address}:${port}`);
  if (name) {
    const bare = name.replace(/\.local$/i, '');
    hosts.add(`${bare}.local:${port}`.toLowerCase());
    hosts.add(`${bare}:${port}`.toLowerCase());
  }
  return hosts;
}

const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY' };
const OWN_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

function sendJson(response, status, body, headers = {}) {
  const text = JSON.stringify(body);
  response.writeHead(status, { ...SECURITY, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  response.end(text);
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// A page of one sentence, for a phone that cannot go further.
function sendNote(response, status, title, sentence) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MADRE</title><link rel="stylesheet" href="/bridge/styles.css"><link rel="stylesheet" href="/bridge/salas.css"></head><body class="salas note"><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(sentence)}</p></main></body></html>`;
  response.writeHead(status, { ...SECURITY, 'content-security-policy': OWN_CSP, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(html);
}

const wantsPage = (request, pathname) => request.method === 'GET' && (pathname === '/' || pathname === '/salas' || String(request.headers.accept ?? '').includes('text/html'));

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

// A short memory of who knocked, so a phone cannot be guessed into by trying codes or tokens.
function limiter({ perMinute }) {
  const seen = new Map();
  return (key, now = Date.now()) => {
    const bucket = seen.get(key) ?? { at: now, n: 0 };
    if (now - bucket.at > 60_000) { bucket.at = now; bucket.n = 0; }
    bucket.n += 1;
    seen.set(key, bucket);
    if (seen.size > 2000) seen.clear();
    return bucket.n <= perMinute;
  };
}

// What a room says about itself in one line, for the list of rooms on the phone.
async function glance(room, device) {
  try {
    // The archive counted too (docs/MACROVERSO.md): on a phone the macroverse is this one line per room.
    const response = await fetch(`http://127.0.0.1:${room.port}/api/glance?census=1`, { headers: { 'x-madre-device': device.id, 'x-madre-device-kind': device.kind }, signal: AbortSignal.timeout(1500) });
    if (response.status === 404) return { outdated: true };
    if (!response.ok) return { unreachable: true };
    return await response.json();
  } catch {
    return { unreachable: true };
  }
}

export function createBridge({ root, port = BRIDGE_PORT, publicDirectory, hosts = () => ownHosts(port), now = () => Date.now() }) {
  const strangers = limiter({ perMinute: 30 });
  const phones = limiter({ perMinute: 900 });

  async function serveOwn(response, pathname) {
    const file = OWN[pathname];
    const body = await readFile(join(publicDirectory, file));
    response.writeHead(200, { ...SECURITY, 'content-security-policy': OWN_CSP, 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    response.end(body);
  }

  // The package's own pictures and fonts, when this copy has them; otherwise the room's.
  async function serveAsset(response, pathname) {
    const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
    const file = join(publicDirectory, relative);
    if (!file.startsWith(join(publicDirectory, 'assets') + sep)) return false;
    const body = await readFile(file).catch(() => null);
    if (!body) return false;
    response.writeHead(200, { ...SECURITY, 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'private, max-age=3600' });
    response.end(body);
    return true;
  }

  async function pass(request, response, url, room, device) {
    let buffered = null;
    let body = null;
    if (inspects(request.method, url.pathname)) {
      buffered = await readBody(request, MESSAGE_LIMIT);
      try { body = JSON.parse(buffered.toString('utf8') || '{}'); } catch { return sendJson(response, 400, { error: t('The message could not be read.') }); }
    }
    const verdict = phonePolicy({ method: request.method, pathname: url.pathname, body });
    if (!verdict.allow) return sendJson(response, verdict.status, { error: verdict.error, phone: true });
    const headers = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (!HOP.has(name) && !name.startsWith('x-madre-')) headers[name] = value;
    }
    headers.host = `127.0.0.1:${room.port}`;
    if (request.headers.origin) headers.origin = `http://127.0.0.1:${room.port}`;
    headers['x-madre-device'] = device.id;
    headers['x-madre-device-kind'] = device.kind;
    if (buffered) headers['content-length'] = String(buffered.length);
    const upstream = http.request({ host: '127.0.0.1', port: room.port, method: request.method, path: url.pathname + url.search, headers }, (answer) => {
      const out = { ...SECURITY };
      for (const [name, value] of Object.entries(answer.headers)) if (!HOP.has(name) && name !== 'set-cookie') out[name] = value;
      // Two rooms may be two versions of MADRE behind the same address: nothing of one is reused for the other.
      if (!url.pathname.startsWith('/assets/')) out['cache-control'] = 'no-store';
      out.vary = 'Cookie';
      response.writeHead(answer.statusCode ?? 502, out);
      answer.pipe(response);
    });
    upstream.on('error', () => { if (!response.headersSent) sendJson(response, 502, { error: t('That project did not answer. It may have just closed on your Mac.') }); else response.end(); });
    // A phone that leaves (a stream it stops reading) takes its request to the room with it.
    response.on('close', () => upstream.destroy());
    if (buffered) upstream.end(buffered);
    else request.pipe(upstream);
  }

  async function handle(request, response) {
    const remote = request.socket.remoteAddress ?? '';
    if (!isPrivateAddress(remote)) { request.socket.destroy(); return; }
    const host = String(request.headers.host ?? '').toLowerCase();
    if (!hosts().has(host)) return sendJson(response, 421, { error: t('MADRE answers only when it is called by this computer\'s name (127.0.0.1 or localhost).') });
    const url = new URL(request.url ?? '/', `http://${host}`);

    if (request.method === 'GET' && url.pathname === '/bridge/ping') return sendJson(response, 200, { madre: true });

    if (request.method === 'GET' && url.pathname === '/bridge/pair') {
      if (!strangers(`pair:${remote}`)) return sendNote(response, 429, t('Too many tries'), t('Wait a minute and scan the code again.'));
      const paired = await redeemInvite(root, url.searchParams.get('c') ?? '', { userAgent: request.headers['user-agent'] ?? '', now: now() });
      if (!paired) return sendNote(response, 410, t('This code no longer works'), t('Each code works once and for ten minutes. Make a new one on your Mac: MADRE on your phone, in the bar.'));
      response.writeHead(303, { ...SECURITY, location: '/salas?listo=1', 'set-cookie': cookie(PHONE_COOKIE, paired.token, MONTH_S), 'cache-control': 'no-store' });
      return response.end();
    }
    // The product's own stylesheets, for the page that tells an unpaired phone how to pair.
    if (request.method === 'GET' && (url.pathname === '/bridge/salas.css' || url.pathname === '/bridge/styles.css')) return serveOwn(response, url.pathname);

    const cookies = parseCookies(request.headers.cookie);
    const store = await readStore(root);
    const device = store.enabled ? await deviceForToken(root, cookies[PHONE_COOKIE], { now: now(), store }) : null;
    if (!device) {
      if (!strangers(`token:${remote}`)) return sendJson(response, 429, { error: t('Too many tries') });
      if (wantsPage(request, url.pathname)) return sendNote(response, 401, t('This phone is not paired'), t('On your Mac, in the bar, press MADRE on your phone and scan the code with this phone\'s camera.'));
      return sendJson(response, 401, { error: t('This phone is not paired.'), pair: true });
    }
    if (!phones(device.id)) return sendJson(response, 429, { error: t('Too many requests from this phone. Wait a moment.') });

    // What changes something has to come from these pages.
    if (!['GET', 'HEAD'].includes(request.method)) {
      const site = request.headers['sec-fetch-site'];
      const origin = request.headers.origin;
      if ((site && site !== 'same-origin') || (origin && origin !== `http://${host}`)) return sendJson(response, 403, { error: t('A page from somewhere else cannot act in this project.') });
    }

    if (request.method === 'GET' && OWN[url.pathname]) {
      if (url.pathname === '/salas') response.setHeader('set-cookie', cookie(PHONE_COOKIE, cookies[PHONE_COOKIE], MONTH_S));
      return serveOwn(response, url.pathname);
    }
    if (request.method === 'GET' && url.pathname === '/bridge/rooms') {
      const rooms = await roomsOnThisMac(root);
      // The Coordinator's own project says so: the phone names it as Home on the Mac does.
      const coordinator = salasRoomId(root);
      const seen = await Promise.all(rooms.map(async (room) => ({ id: room.id, project: room.project, ...(room.id === coordinator ? { coordinator: true } : {}), ...(await glance(room, device)) })));
      // Where the person stood on the Mac, offered when it is newer than where they stood here.
      const where = await readHandoff(root);
      const carry = where.mac && (!where.phone || where.mac.at > where.phone.at) && now() - where.mac.at < 12 * 60 * 60 * 1000 ? where.mac : null;
      return sendJson(response, 200, { mac: hostname().replace(/\.local$/i, ''), language: language(), device, rooms: seen, chosen: cookies[ROOM_COOKIE] ?? null, handoff: carry });
    }
    if (request.method === 'POST' && url.pathname === '/bridge/open') {
      const payload = await readBody(request, 4096).then((raw) => JSON.parse(raw.toString('utf8') || '{}')).catch(() => ({}));
      const room = (await roomsOnThisMac(root)).find((one) => one.id === payload.room);
      if (!room) return sendJson(response, 404, { error: t('That project is closed on your Mac.') });
      return sendJson(response, 200, { ok: true, room: room.id }, { 'set-cookie': cookie(ROOM_COOKIE, room.id, MONTH_S) });
    }
    if (request.method === 'POST' && url.pathname === '/bridge/stop-all') {
      const rooms = await roomsOnThisMac(root);
      const stopped = await Promise.all(rooms.map((room) => fetch(`http://127.0.0.1:${room.port}/api/stop-all`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-madre-device': device.id, 'x-madre-device-kind': device.kind }, body: '{}', signal: AbortSignal.timeout(3000) }).then((answer) => answer.ok).catch(() => false)));
      return sendJson(response, 200, { rooms: rooms.length, stopped: stopped.filter(Boolean).length });
    }
    if (request.method === 'GET' && url.pathname.startsWith('/assets/') && await serveAsset(response, url.pathname)) return;

    const room = (await roomsOnThisMac(root)).find((one) => one.id === cookies[ROOM_COOKIE]);
    if (!room) {
      if (wantsPage(request, url.pathname)) { response.writeHead(303, { ...SECURITY, location: '/salas', 'cache-control': 'no-store' }); return response.end(); }
      return sendJson(response, 409, { error: t('That project is closed on your Mac.'), salas: true });
    }
    return pass(request, response, url, room, device);
  }

  return http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.headersSent) { response.end(); return; }
      sendJson(response, error.status ?? 500, { error: error.status === 413 ? t('That is too large to send from the phone.') : t('MADRE on your phone could not do that.') });
    });
  });
}
