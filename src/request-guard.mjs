// The room listens on 127.0.0.1, which keeps other computers out but not other web pages: any
// site open in this browser can send a request to 127.0.0.1:4317, and an uploaded module is code
// MADRE runs with your permissions. Two checks, before any route, close that door.
//
//  · Host has to name this computer. A page that points its own domain at 127.0.0.1 (DNS
//    rebinding) still sends its domain as Host, so it never reaches a route — reads included.
//  · A browser says who is asking in Origin. Anything that changes state has to come from the
//    room's own page. A terminal, an agent's curl or MADRE's own CLI send no Origin and pass.

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function hostIsLocal(host) {
  if (typeof host !== 'string' || !host) return false;
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0];
  return LOOPBACK.has(name.toLowerCase());
}

// null when the request may go on, otherwise the reason it may not.
export function refuseForeign({ method = 'GET', headers = {} } = {}) {
  if (!hostIsLocal(headers.host)) return 'MADRE answers only when it is called by this computer\'s name (127.0.0.1 or localhost).';
  const origin = headers.origin;
  if (SAFE.has(method) || origin === undefined) return null;
  if (origin === `http://${headers.host}` || origin === `https://${headers.host}`) return null;
  return 'A page from somewhere else cannot act in this room.';
}
