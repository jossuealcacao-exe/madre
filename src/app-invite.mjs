// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE INVITATION TO THE APP (2026-11-10, asked by the author): whoever updates MADRE and uses
// it in the browser is asked, once per version, whether to stay in the browser or download the app for
// their computer — a window on Home after the update (public/salas-mac.js, offerApp; it was a strip
// until the author asked for the choice, 2026-11-10). Someone new meets the app at madre.run, where
// they download it; nothing here speaks to them.
//
// Not inside the app, not to whoever already has MADRE.app in Applications, and not before the app can
// be downloaded for that desktop: madre.run/app/latest.json — what the app's own updater reads — has
// to list it (a Mac only, today). That file is asked for only when everything else says yes, at most
// once a day, and nothing goes with the request.

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

// Which desktop the person is at (2026-11-10): a Mac, Windows — also when MADRE runs in WSL, since the
// person is at Windows and the app they would download is Windows' — or Linux.
export const DESKTOPS = ['mac', 'windows', 'linux'];
export const desktopOf = ({ platform = process.platform, wsl = false } = {}) => (platform === 'darwin' ? 'mac' : platform === 'win32' || wsl ? 'windows' : platform === 'linux' ? 'linux' : null);
// How the app's updater names each desktop in latest.json (`darwin-aarch64`, `windows-x86_64`…).
const MANIFEST_PREFIX = { mac: 'darwin-', windows: 'windows-', linux: 'linux-' };

// The desktops the app can be downloaded for: what madre.run/app/latest.json says, kept for a day. A
// manifest with a version and no list of platforms is a Mac's (the first app, 2026-11). A failed read
// is kept too, so a computer without internet does not ask on every visit.
export async function appDesktops({ root, fetchImpl = globalThis.fetch, url = process.env.PULSE_APP_MANIFEST_URL ?? APP_MANIFEST, now = Date.now() }) {
  const kept = await readKept(root);
  if (kept.checkedAt && now - kept.checkedAt < DAY_MS && Array.isArray(kept.desktops)) return kept.desktops;
  let desktops = [];
  try {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    const manifest = response.ok ? await response.json().catch(() => null) : null;
    if (isVersion(manifest?.version)) {
      const keys = manifest.platforms && typeof manifest.platforms === 'object' ? Object.keys(manifest.platforms) : null;
      desktops = keys ? DESKTOPS.filter((desktop) => keys.some((key) => key.startsWith(MANIFEST_PREFIX[desktop]))) : ['mac'];
    }
  } catch { /* not reachable: nothing to download today */ }
  await keep(root, { desktops, checkedAt: now }).catch(() => null);
  return desktops;
}

// Everything but the download, without touching the network: a desktop, outside the app, an update,
// no app installed here, and not yet answered in this version.
export function appInviteDue({ desktop, env = process.env, novelty, version, answeredFor = null, installed = false }) {
  if (!desktop || env.MADRE_APP === '1') return false;
  if (!cameFromOlder(novelty, version)) return false;
  if (installed) return false;
  return answeredFor !== version;
}

// What Home asks: whether to show the choice now, for which desktop, and where its link goes. Only
// for a desktop the app is published for: Windows and Linux see nothing until theirs is.
export async function appInvite({ root, novelty, version, platform, wsl = false, env, fetchImpl, installed }) {
  const desktop = desktopOf({ platform, wsl });
  const kept = await readKept(root);
  const here = installed ?? (desktop === 'mac' && appInstalled());
  if (!appInviteDue({ desktop, env, novelty, version, answeredFor: kept.answered ?? null, installed: here })) return { show: false, desktop };
  const desktops = await appDesktops({ root, fetchImpl });
  // The page can be another for a test on this computer (PULSE_APP_PAGE_URL), as the manifest can.
  return desktops.includes(desktop) ? { show: true, desktop, url: env?.PULSE_APP_PAGE_URL ?? process.env.PULSE_APP_PAGE_URL ?? APP_PAGE } : { show: false, desktop };
}

// «Download» or «Stay in the browser» spends it for this version; «shown» only counts.
export async function answerAppInvite(root, { answer, version }) {
  if (!APP_INVITE_ANSWERS.includes(answer)) return { error: 'answer' };
  if (answer !== 'shown') await keep(root, { answered: version });
  return { ok: true };
}
