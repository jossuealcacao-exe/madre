// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE INVITATION TO THE APP (2026-11-10, asked by the author): whoever updates MADRE on a Mac and uses
// it in the browser is told, once per version and without getting in the way, that MADRE also comes
// as an app — a strip on Home, never a window. Someone new meets the app at madre.run, where they
// download it; nothing here speaks to them.
//
// Not inside the app, not on Linux or Windows (there is no app for them yet), not to whoever already
// has MADRE.app in Applications, and not before the app can be downloaded: it is due only once
// madre.run/app/latest.json — what the app's own updater reads — names a version. That file is asked
// for only when everything else says yes, at most once a day, and nothing goes with the request.

import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { cameFromOlder } from './whats-new.mjs';
import { isVersion } from './updates.mjs';

export const APP_PAGE = 'https://madre.run/app/';
export const APP_MANIFEST = 'https://madre.run/app/latest.json';
export const APP_INVITE_ANSWERS = ['shown', 'open', 'later'];
const FILE = 'app-invite.json';
const DAY_MS = 24 * 60 * 60 * 1000;

// Where an installed MADRE.app would be: the Applications of the computer or of this person.
export const appInstalled = ({ home = homedir(), exists = existsSync } = {}) => ['/Applications/MADRE.app', join(home, 'Applications', 'MADRE.app')].some((path) => exists(path));

async function readKept(root) {
  try { return JSON.parse(await readFile(join(root, FILE), 'utf8')) ?? {}; } catch { return {}; }
}
async function keep(root, change) {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, FILE), `${JSON.stringify({ ...(await readKept(root)), ...change }, null, 2)}\n`);
}

// Whether the app can be downloaded: what madre.run/app/latest.json said, kept for a day. A failed
// read is kept too, so a computer without internet does not ask on every visit.
export async function appAvailable({ root, fetchImpl = globalThis.fetch, url = process.env.PULSE_APP_MANIFEST_URL ?? APP_MANIFEST, now = Date.now() }) {
  const kept = await readKept(root);
  if (kept.checkedAt && now - kept.checkedAt < DAY_MS) return Boolean(kept.available);
  let available = false;
  try {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    available = response.ok && isVersion((await response.json().catch(() => null))?.version);
  } catch { /* not reachable: not available today */ }
  await keep(root, { available, checkedAt: now }).catch(() => null);
  return available;
}

// Everything but the download, without touching the network: a Mac, outside the app, an update,
// no MADRE.app here, and not yet answered in this version.
export function appInviteDue({ platform = process.platform, env = process.env, novelty, version, answeredFor = null, installed = false }) {
  if (platform !== 'darwin' || env.MADRE_APP === '1') return false;
  if (!cameFromOlder(novelty, version)) return false;
  if (installed) return false;
  return answeredFor !== version;
}

// What Home asks: whether to show the strip now, and where its link goes.
export async function appInvite({ root, novelty, version, platform, env, fetchImpl, installed = appInstalled() }) {
  const kept = await readKept(root);
  if (!appInviteDue({ platform, env, novelty, version, answeredFor: kept.answered ?? null, installed })) return { show: false };
  const available = await appAvailable({ root, fetchImpl });
  return available ? { show: true, url: APP_PAGE } : { show: false };
}

// «Download» or «Not now» spends it for this version; «shown» only counts.
export async function answerAppInvite(root, { answer, version }) {
  if (!APP_INVITE_ANSWERS.includes(answer)) return { error: 'answer' };
  if (answer !== 'shown') await keep(root, { answered: version });
  return { ok: true };
}
