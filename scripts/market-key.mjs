#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The Market's key (2026-10-18). Makes the author's Ed25519 pair once: the private half stays on
// this Mac, outside every repository (~/.madre/mercado/ed25519.pem, readable only by its owner);
// the public half is written into src/market-key.mjs, which every copy of MADRE carries and checks
// the catalog against. It refuses to replace a key that is already there: a new key means every
// MADRE already installed stops trusting the Market until it updates.
//
//   node scripts/market-key.mjs            make the pair (once)
//   node scripts/market-key.mjs --public   print the public half of the key already there

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = process.env.MADRE_MARKET_KEY_DIR || join(homedir(), '.madre', 'mercado');
const file = join(dir, 'ed25519.pem');
const target = new URL('../src/market-key.mjs', import.meta.url);

const existing = await readFile(file, 'utf8').catch(() => null);
if (process.argv.includes('--public')) {
  if (!existing) { console.error(`No key at ${file}. Run without --public to make one.`); process.exit(1); }
  process.stdout.write(createPublicKey(createPrivateKey(existing)).export({ type: 'spki', format: 'pem' }));
  process.exit(0);
}
if (existing) { console.error(`There is already a key at ${file}. It stays: replacing it breaks every MADRE that trusts it.`); process.exit(1); }

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
await mkdir(dir, { recursive: true, mode: 0o700 });
await writeFile(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
await chmod(file, 0o600);
const pem = publicKey.export({ type: 'spki', format: 'pem' }).trim();
await writeFile(target, `// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The public half of the Market's key (scripts/market-key.mjs). The catalog at madre.run/mercado/
// is signed with the private half, which lives only on the author's computer; a catalog this key
// does not verify is not read, and nothing in it is installed (src/market-remote.mjs).
export const MARKET_PUBLIC_KEY = \`${pem}\`;
`);
console.log(`Private key: ${file} (only you can read it; keep a copy somewhere safe, offline)`);
console.log('Public key written to src/market-key.mjs:');
console.log(pem);
