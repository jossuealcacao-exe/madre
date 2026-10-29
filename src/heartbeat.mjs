// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «Still in use»: once a day, every copy of MADRE tells madre.run it is on (2026-10-13).
//
// What goes, and nothing else: a random identifier this copy made for itself once
// (~/.pulse/install-id, from crypto.randomUUID — derived from nothing about the person or the
// machine), the MADRE version, the system (darwin, linux, win32) and Node's major version. No
// name, no email, no project, no path, no agent, nothing said in a room. madre.run keeps no IP
// (functions/api/ping.js of the landing). It is how the author knows how many people use MADRE,
// which versions they run and whether they come back — what npm's download count cannot say.
//
// It is said in docs/REFERENCE.md › «Lo que sale de la máquina» and on madre.run, and it goes
// through the same fetch every other outbound request does, so the room's own list of what left
// the machine shows it. Offline or behind a firewall it fails in silence and is tried again
// later: MADRE never waits on it. PULSE_HEARTBEAT_URL points it elsewhere, for development and
// for the test suite, which must never reach madre.run.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const HEARTBEAT_URL = 'https://madre.run/api/ping';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function installId(root) {
  const file = join(root, 'install-id');
  const kept = (await readFile(file, 'utf8').catch(() => '')).trim();
  if (ID.test(kept)) return kept;
  const made = randomUUID();
  await mkdir(root, { recursive: true });
  await writeFile(file, `${made}\n`, { mode: 0o600 });
  return made;
}

// What the request carries: built here, in one place, so a test can say exactly what leaves.
export const heartbeatBody = ({ id, version, platform = process.platform, node = process.versions.node }) => ({
  id, version, os: ['darwin', 'linux', 'win32'].includes(platform) ? platform : 'other', node: String(node).split('.')[0],
});

// Once per UTC day per copy, whichever of its processes gets there first; a day that failed is
// tried again on the next call.
export async function heartbeat({ root, version, fetchImpl = globalThis.fetch, url = process.env.PULSE_HEARTBEAT_URL ?? HEARTBEAT_URL, now = new Date() }) {
  const day = now.toISOString().slice(0, 10);
  const stamp = join(root, 'heartbeat.json');
  try {
    if (JSON.parse(await readFile(stamp, 'utf8')).day === day) return { sent: false, reason: 'today' };
  } catch { /* never sent, or unreadable: send */ }
  try {
    const body = heartbeatBody({ id: await installId(root), version });
    const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { sent: false, reason: `HTTP ${response.status}` };
    await writeFile(stamp, `${JSON.stringify({ day })}\n`);
    return { sent: true, body };
  } catch (error) {
    return { sent: false, reason: error?.message ?? 'unreachable' };
  }
}
