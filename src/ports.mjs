// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// What is listening on this computer, so RIPLEY can look at it.
//
// A room that renders a project's files but cannot open the project's own dev server is half a
// viewer: most of what a human builds these days answers on a port, not from a file. This finds
// the ports; opening one is the human's, and starting one is not here at all — starting a server
// runs a command, and commands are #4.
//
// Read-only and local by construction: only what listens on loopback, only this user's own
// processes, and never a port on another machine. The probe is `lsof`, which reports and changes
// nothing; parsing it is pure and tested as such.

// Ports that belong to the machine rather than to anything the human is building. Showing them
// would be noise at best and an invitation to frame somebody else's service at worst.
const SYSTEM_PORTS = new Set([22, 25, 53, 88, 139, 445, 548, 631, 5353, 7000]);
// Processes that always listen and never serve a page worth previewing.
// Ollama is here because MADRE itself uses it (the local model, @madre): started from a project
// folder it would pass for that project's server. So is its runner, `llama-server` («llama-ser» in
// lsof's nine letters): each model it loads listens on a port of its own and closes it when the
// model is unloaded after a few idle minutes, which read as «your server stopped» (2026-10-17).
const NOISE = /^(rapportd|sharingd|identityservicesd|controlce|remoted|launchd|mDNSResponder|cupsd|Spotify|Dropbox|Docker|com\.docker|ollama|llama-ser)/i;

// One `lsof -nP -iTCP -sTCP:LISTEN` table into the ports a human might want to look at.
// Everything listening, split by where it listens: loopback, or every interface (* or 0.0.0.0),
// which is reachable from the network too. `node server.js` and `python -m http.server` bind every
// interface by default. Since 2026-10-18 the servers sentinel offers a project's own server from
// either half, opened on 127.0.0.1, and says which ones the network can also reach.
export function classifyListening(output = '', { self = null } = {}) {
  const found = new Map();
  const wider = new Map();
  for (const line of String(output ?? '').split('\n').slice(1)) {
    const match = line.match(/^(\S+)\s+(\d+)\s+\S+\s+\S+\s+(IPv4|IPv6)\s+\S+\s+\S+\s+\S+\s+(\S+)\s+\(LISTEN\)/);
    if (!match) continue;
    const [, raw, pid, , address] = match;
    // lsof escapes anything unprintable, spaces included: "Code\x20Helper".
    const command = raw.replace(/\\x([0-9a-f]{2})/gi, (whole, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    const host = address.slice(0, address.lastIndexOf(':'));
    const port = Number(address.slice(address.lastIndexOf(':') + 1));
    if (!Number.isInteger(port) || port <= 0 || port > 65535) continue;
    if (SYSTEM_PORTS.has(port) || NOISE.test(command)) continue;
    if (self && port === Number(self)) continue;
    if (!['127.0.0.1', '[::1]', 'localhost'].includes(host)) {
      // Bound to every interface, so reachable from the network. Not offered, but counted: the
      // human deserves to know their server is there and why it is not on the list.
      if (['*', '0.0.0.0', '[::]'].includes(host) && !wider.has(port)) wider.set(port, { port, pid: Number(pid), command, host });
      continue;
    }
    const seen = found.get(port);
    if (!seen) found.set(port, { port, pid: Number(pid), command });
  }
  const byPort = (a, b) => a.port - b.port;
  return {
    ports: [...found.values()].sort(byPort),
    // A port answering on both loopback and every interface is already openable; it is not news.
    wider: [...wider.values()].filter((one) => !found.has(one.port)).sort(byPort),
  };
}

// Where each listening process was started, from `lsof -a -p <pids> -d cwd -Fpn`: a `p<pid>` line
// then an `n<path>` line. Same tool, same read-only look; it is how a list of ports learns which
// one is this project's own dev server rather than somebody else's on the same machine.
export function parseCwds(output = '') {
  const cwds = new Map();
  let pid = null;
  for (const line of String(output ?? '').split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n') && Number.isInteger(pid)) cwds.set(pid, line.slice(1));
  }
  return cwds;
}

// A process started in the project or anywhere under it serves this project.
export function inProject(cwd, projectRoot) {
  if (!cwd || !projectRoot) return false;
  const root = String(projectRoot).replace(/\/+$/, '');
  return cwd === root || cwd.startsWith(`${root}/`);
}

// What RIPLEY may open, which is what nearly every caller wants.
export function parseListening(output = '', options = {}) {
  return classifyListening(output, options).ports;
}

// Whether a server agrees to be put behind glass. A page can refuse, and refusing is the correct
// thing for most of them to do — RIPLEY cannot override it and should not want to. What it can do
// is say so, instead of handing the human a grey rectangle with a broken-document icon and no
// explanation of why their own site will not show.
export function framable(headers) {
  const get = (name) => String(headers?.get?.(name) ?? '');
  if (/\b(deny|sameorigin)\b/i.test(get('x-frame-options'))) return false;
  const ancestors = get('content-security-policy').split(';').map((rule) => rule.trim()).find((rule) => /^frame-ancestors\b/i.test(rule));
  if (!ancestors) return true;
  const allowed = ancestors.split(/\s+/).slice(1);
  // 'none' is a closed door; 'self' means only itself, which is not us.
  return !allowed.some((value) => /^'(none|self)'$/i.test(value)) && allowed.length > 0;
}

// A port that answers HTTP, and what it calls itself. A listening socket is not a web server:
// a database, a language server and an editor all listen, and framing one shows a blank page or
// a download. One HEAD-like GET settles it, with a short fuse because a local port either
// answers at once or is not what we are looking for.
export async function probePort(port, { fetchImpl = fetch, timeoutMs = 1200 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/`, { signal: controller.signal, redirect: 'manual' });
    const type = String(response.headers?.get?.('content-type') ?? '');
    return { ok: true, status: response.status, html: /text\/html/i.test(type), contentType: type || null, framable: framable(response.headers) };
  } catch {
    return { ok: false, status: null, html: false, contentType: null };
  } finally {
    clearTimeout(timer);
  }
}
