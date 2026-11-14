// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The picture and the title of a link an agent gave, asked for by the person (2026-11-14).
//
// An answer that lists apartments, products or articles reads better as cards: a photo, a title and
// the site it is on. The photo lives on that site, and fetching it tells that site that someone
// looked; so nothing is fetched while an answer is drawn. The person presses «Show photos», and only
// then does MADRE ask each page for its preview (og:image, og:title, og:site_name) and the picture
// itself, which travels back to the page as a data: address — the page's own rules forbid pictures
// from anywhere else, and that stays so.
//
// Two locks. Only http and https, and never an address on this computer or its network: a link
// in an answer must not become a way to read the router's page or a port on the Mac. And what comes
// back is bounded: so much of a page, so big a picture, so long a wait.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const PAGE_BYTES = 768 * 1024;
const IMAGE_BYTES = 4 * 1024 * 1024;
const WAIT_MS = 9000;
const HOPS = 4;
const IMAGE_TYPES = /^image\/(png|jpe?g|gif|webp|avif)\b/i;
// A browser's way of asking: many sites answer a plain script with an error page.
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*;q=0.9,*/*;q=0.8',
  'accept-language': 'es-MX,es;q=0.9,en;q=0.8',
};

// The addresses asked for by a person's press, so the log of what left the Mac names them as
// that and not as an address nobody declared (outbound.mjs, «web-page»). Held a minute.
const asked = new Map();
export function askedByPerson(rawUrl) {
  try {
    const href = new URL(rawUrl).href;
    const until = asked.get(href);
    if (!until) return false;
    if (until < Date.now()) { asked.delete(href); return false; }
    return true;
  } catch { return false; }
}
function markAsked(href) {
  asked.set(href, Date.now() + 60_000);
  if (asked.size > 400) for (const [key, until] of asked) if (until < Date.now()) asked.delete(key);
}

// This computer and its network, in both families.
export function privateAddress(address) {
  const ip = String(address ?? '').replace(/^\[|\]$/g, '').toLowerCase();
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (isIP(ip) === 6) return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff');
  return true;
}

async function publicUrl(raw, resolve = lookup) {
  let url;
  try { url = new URL(raw); } catch { return { error: 'bad-url' }; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return { error: 'bad-url' };
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || /(^|\.)(localhost|local|internal|home|lan)$/i.test(host)) return { error: 'private' };
  const addresses = isIP(host) ? [{ address: host }] : await resolve(host, { all: true }).catch(() => []);
  if (!addresses.length) return { error: 'unreachable' };
  if (addresses.some((one) => privateAddress(one.address))) return { error: 'private' };
  return { url };
}

// One request, following redirects by hand so every hop passes the same lock.
async function fetchPublic(raw, { fetchImpl, resolve }) {
  let next = raw;
  for (let hop = 0; hop <= HOPS; hop += 1) {
    const checked = await publicUrl(next, resolve);
    if (checked.error) return checked;
    markAsked(checked.url.href);
    const response = await fetchImpl(checked.url.href, { headers: HEADERS, redirect: 'manual', signal: AbortSignal.timeout(WAIT_MS) });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      next = new URL(response.headers.get('location'), checked.url).href;
      await response.body?.cancel?.().catch(() => {});
      continue;
    }
    return { response, url: checked.url };
  }
  return { error: 'redirects' };
}

async function readCapped(response, cap) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > cap) { await response.body?.cancel?.().catch(() => {}); return null; }
  const reader = response.body?.getReader?.();
  if (!reader) return Buffer.from(await response.arrayBuffer()).subarray(0, cap);
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) { await reader.cancel().catch(() => {}); return chunks.length ? Buffer.concat(chunks) : null; }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(text) {
  return String(text ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim();
}

// What a page says about itself in its head: the preview tags, then its title.
export function readPreview(html, base) {
  const head = String(html ?? '').slice(0, PAGE_BYTES);
  const meta = new Map();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const value = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && value !== undefined && !meta.has(key)) meta.set(key, decode(value));
  }
  const title = meta.get('og:title') || meta.get('twitter:title') || decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  let image = meta.get('og:image:secure_url') || meta.get('og:image') || meta.get('og:image:url') || meta.get('twitter:image') || meta.get('twitter:image:src') || null;
  try { image = image ? new URL(image, base).href : null; } catch { image = null; }
  return {
    title: title ? title.slice(0, 200) : null,
    site: (meta.get('og:site_name') || '').slice(0, 80) || null,
    description: (meta.get('og:description') || meta.get('description') || '').slice(0, 300) || null,
    image,
  };
}

async function imageData(raw, options) {
  const got = await fetchPublic(raw, options);
  if (got.error || !got.response.ok) { await got.response?.body?.cancel?.().catch(() => {}); return null; }
  const type = got.response.headers.get('content-type') ?? '';
  if (!IMAGE_TYPES.test(type)) { await got.response.body?.cancel?.().catch(() => {}); return null; }
  const bytes = await readCapped(got.response, IMAGE_BYTES);
  return bytes?.length ? `data:${type.split(';')[0].trim().toLowerCase()};base64,${bytes.toString('base64')}` : null;
}

const cache = new Map();
// The preview of one link: its picture as a data: address, its title and its site. A link that is
// itself a picture comes back as one. Never throws: a page that does not answer is a card without
// a photo, said so.
export async function webPreview(raw, { fetchImpl = globalThis.fetch, resolve = lookup } = {}) {
  const key = String(raw ?? '');
  if (cache.has(key)) return cache.get(key);
  const options = { fetchImpl, resolve };
  let result;
  try {
    const got = await fetchPublic(key, options);
    if (got.error) result = { ok: false, error: got.error };
    else if (!got.response.ok) { await got.response.body?.cancel?.().catch(() => {}); result = { ok: false, error: 'refused', status: got.response.status }; }
    else {
      const type = got.response.headers.get('content-type') ?? '';
      if (IMAGE_TYPES.test(type)) {
        const bytes = await readCapped(got.response, IMAGE_BYTES);
        result = bytes?.length ? { ok: true, image: `data:${type.split(';')[0].trim().toLowerCase()};base64,${bytes.toString('base64')}`, title: null, site: null } : { ok: false, error: 'too-big' };
      } else if (/html|xml/i.test(type)) {
        const page = await readCapped(got.response, PAGE_BYTES);
        const preview = readPreview(page?.toString('utf8') ?? '', got.url);
        const image = preview.image ? await imageData(preview.image, options).catch(() => null) : null;
        result = { ok: true, title: preview.title, site: preview.site, description: preview.description, image };
      } else { await got.response.body?.cancel?.().catch(() => {}); result = { ok: false, error: 'not-a-page' }; }
    }
  } catch (error) {
    result = { ok: false, error: error?.name === 'TimeoutError' ? 'slow' : 'unreachable' };
  }
  // A page that did not answer may answer the next press; only what came back is kept.
  if (result.ok) {
    cache.set(key, result);
    if (cache.size > 300) cache.delete(cache.keys().next().value);
  }
  return result;
}
