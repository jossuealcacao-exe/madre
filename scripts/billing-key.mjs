#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The key of MADRE App's subscription keys (2026-11-17, docs/private/SUSCRIPCION.md). Makes the Ed25519
// pair once: the private half stays on this computer, outside every repository
// (~/.madre/cobro/ed25519.pem, readable only by its owner) and goes to madre.run as the secret
// BILLING_PRIVATE_KEY; the public half is written into src/billing-key.mjs, which every copy carries
// to check the keys it is given (src/billing.mjs). A fourth key, apart from the notices', the
// Market's and the factory's. It refuses to replace a key that is already there: a new key means
// every subscription key already issued stops being accepted.
//
//   node scripts/billing-key.mjs            make the pair (once)
//   node scripts/billing-key.mjs --public   print the public half of the key already there
//   node scripts/billing-key.mjs --secret   print the private half, to paste into
//                                           `npx wrangler pages secret put BILLING_PRIVATE_KEY`

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = process.env.MADRE_BILLING_KEY_DIR || join(homedir(), '.madre', 'cobro');
const file = join(dir, 'ed25519.pem');
const target = new URL('../src/billing-key.mjs', import.meta.url);

const existing = await readFile(file, 'utf8').catch(() => null);
if (process.argv.includes('--public') || process.argv.includes('--secret')) {
  if (!existing) { console.error(`No key at ${file}. Run without flags to make one.`); process.exit(1); }
  process.stdout.write(process.argv.includes('--secret') ? existing : createPublicKey(createPrivateKey(existing)).export({ type: 'spki', format: 'pem' }));
  process.exit(0);
}
if (existing) { console.error(`There is already a key at ${file}. It stays: replacing it refuses every key already issued.`); process.exit(1); }

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
await mkdir(dir, { recursive: true, mode: 0o700 });
await writeFile(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
await chmod(file, 0o600);
const pem = publicKey.export({ type: 'spki', format: 'pem' }).trim();
const source = await readFile(target, 'utf8');
const line = /export const BILLING_PUBLIC_KEY = (?:`[^`]*`|null);/;
if (!line.test(source)) throw new Error('src/billing-key.mjs has no BILLING_PUBLIC_KEY to fill.');
await writeFile(target, source.replace(line, `export const BILLING_PUBLIC_KEY = \`${pem}\`;`));
console.log(`Key made at ${file}.\nThe public half is in src/billing-key.mjs.\nNext: node scripts/billing-key.mjs --secret | npx wrangler pages secret put BILLING_PRIVATE_KEY (in the landing).`);
