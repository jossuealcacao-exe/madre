// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// ACCEPTING MADRE'S LICENSE AND PRIVACY NOTICE (2026-10-30). Before MADRE can be used, the person
// accepts its license (LICENSE, the Business Source License 1.1: free for individuals and teams of
// up to ten) and its privacy notice, once per version of their text (TERMS_VERSION), on this computer.
// Whoever came from a MADRE before 1.1.0 is told what changed. The anonymous diagnostics are not a
// condition: they come on, said in plain words, and can be turned off right there or later.
//
// Kept in ~/.pulse/terms.json: the version accepted and when. Tests and automation (screenshots, QA
// houses) skip it with PULSE_TERMS=accepted; the test mode never asks.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// A new text (Pro and paid modules in 1.1.1) is a new version, and the person is asked again.
export const TERMS_VERSION = '2026-10-30';
export const TERMS_LINKS = {
  license: { es: 'https://github.com/jossuealcacao-exe/madre/blob/main/LICENSE', en: 'https://github.com/jossuealcacao-exe/madre/blob/main/LICENSE' },
  privacy: { es: 'https://madre.run/privacidad/', en: 'https://madre.run/en/privacy/' },
};

// THE DESKTOP APP HAS ITS OWN LICENSE (2026-11-11, the author): MADRE for Mac and Linux, the app
// (~/madre-app, private), is closed code, so inside it the person accepts the app's license of use —
// not the source code's. The MADRE on GitHub and npm keeps the Business Source License, unchanged. A
// text of its own is a version of its own: whoever accepted the source's in a browser is asked again
// the first time MADRE opens inside the app, and the other way round.
// 2026-11-13: the personal license (free for a person, not for organizations; ~/madre-app/LICENCIA-DE-USO.md).
export const APP_TERMS_VERSION = 'app-2026-11-13';
export const APP_TERMS_LINKS = {
  license: { es: 'https://madre.run/app/licencia/', en: 'https://madre.run/en/app/license/' },
  privacy: TERMS_LINKS.privacy,
};
export const inApp = (env = process.env) => env.MADRE_APP === '1';
export const termsVersion = (env = process.env) => (inApp(env) ? APP_TERMS_VERSION : TERMS_VERSION);
export const termsLinks = (env = process.env) => (inApp(env) ? APP_TERMS_LINKS : TERMS_LINKS);
export const termsKind = (env = process.env) => (inApp(env) ? 'app' : 'source');

export const termsWaived = (env = process.env) => env.PULSE_TEST_MODE === '1' || env.PULSE_TERMS === 'accepted';

export async function readTerms(root, { env = process.env } = {}) {
  const version = termsVersion(env);
  const kind = termsKind(env);
  if (termsWaived(env)) return { accepted: true, version, kind, at: null, waived: true };
  try {
    const kept = JSON.parse(await readFile(join(root, 'terms.json'), 'utf8'));
    return { accepted: kept?.version === version, version, kind, at: typeof kept?.at === 'string' ? kept.at : null, previous: kept?.version ?? null };
  } catch {
    return { accepted: false, version, kind, at: null, previous: null };
  }
}

export async function acceptTerms(root, { now = new Date(), env = process.env } = {}) {
  const kept = { version: termsVersion(env), at: now.toISOString() };
  await writeFile(join(root, 'terms.json'), `${JSON.stringify(kept)}\n`);
  return { accepted: true, ...kept };
}

// Whether this copy was in use before 1.1.0 (src/install-metrics.mjs, lifecycle.json `before`): it
// is told what changed instead of being welcomed as new.
export async function cameFromBefore(root) {
  try { return JSON.parse(await readFile(join(root, 'lifecycle.json'), 'utf8'))?.before === true; } catch { return false; }
}
