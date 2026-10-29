#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The author's key to «MADRE usage», the Home widget that reads madre.run/api/usage.
//
//   node scripts/owner-usage.mjs            makes a new token, keeps it in this Mac's vault and
//                                           prints the SHA-256 madre.run needs
//   node scripts/owner-usage.mjs --forget   takes the token out of the vault
//
// The token is never printed and never leaves the vault except as the Authorization header of
// that one request. madre.run keeps only its hash, in the secret USAGE_TOKEN_HASH:
//
//   npx wrangler pages secret put USAGE_TOKEN_HASH --project-name madre-landing
//
// This script is not in the npm package (package.json › files): the widget exists only for a
// copy run from this repository.

import { createHash, randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { forgetSecret, writeSecret } from '../src/vault.mjs';
import { OWNER_VAULT } from '../src/server.mjs';

const root = process.env.PULSE_HOME ?? join(homedir(), '.pulse');
if (process.argv.includes('--forget')) {
  await forgetSecret(root, OWNER_VAULT, 'usage');
  console.log('Token removed from this Mac. The widget disappears on the next reading.');
  process.exit(0);
}
const token = randomBytes(32).toString('hex');
const saved = await writeSecret(root, OWNER_VAULT, 'usage', token);
if (!saved.ok) { console.error(saved.error); process.exit(1); }
console.log('Token saved in this Mac\'s vault (0600).');
console.log('');
console.log('USAGE_TOKEN_HASH for madre.run:');
console.log(createHash('sha256').update(token).digest('hex'));
console.log('');
console.log('Set it with: npx wrangler pages secret put USAGE_TOKEN_HASH --project-name madre-landing');
