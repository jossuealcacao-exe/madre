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

export const termsWaived = (env = process.env) => env.PULSE_TEST_MODE === '1' || env.PULSE_TERMS === 'accepted';

export async function readTerms(root, { env = process.env } = {}) {
  if (termsWaived(env)) return { accepted: true, version: TERMS_VERSION, at: null, waived: true };
  try {
    const kept = JSON.parse(await readFile(join(root, 'terms.json'), 'utf8'));
    return { accepted: kept?.version === TERMS_VERSION, version: TERMS_VERSION, at: typeof kept?.at === 'string' ? kept.at : null, previous: kept?.version ?? null };
  } catch {
    return { accepted: false, version: TERMS_VERSION, at: null, previous: null };
  }
}

export async function acceptTerms(root, { now = new Date() } = {}) {
  const kept = { version: TERMS_VERSION, at: now.toISOString() };
  await writeFile(join(root, 'terms.json'), `${JSON.stringify(kept)}\n`);
  return { accepted: true, ...kept };
}

// Whether this copy was in use before 1.1.0 (src/install-metrics.mjs, lifecycle.json `before`): it
// is told what changed instead of being welcomed as new.
export async function cameFromBefore(root) {
  try { return JSON.parse(await readFile(join(root, 'lifecycle.json'), 'utf8'))?.before === true; } catch { return false; }
}
