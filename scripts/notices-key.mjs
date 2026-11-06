#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The key of the author's notices (Q-11, 2026-11-06). Makes the author's Ed25519 pair once: the
// private half stays on this computer, outside every repository (~/.madre/avisos/ed25519.pem,
// readable only by its owner); the public half is written into src/notices-key.mjs, which every copy
// of MADRE carries and checks each notice against (src/notices.mjs). A third key, apart from the
// Market's and the factory's: one leaking never lets anyone speak as the author through the others.
// It refuses to replace a key that is already there: a new key means every MADRE already installed
// stops showing the author's notices until it updates.
//
//   node scripts/notices-key.mjs            make the pair (once)
//   node scripts/notices-key.mjs --public   print the public half of the key already there

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = process.env.MADRE_NOTICES_KEY_DIR || join(homedir(), '.madre', 'avisos');
const file = join(dir, 'ed25519.pem');
const target = new URL('../src/notices-key.mjs', import.meta.url);

const existing = await readFile(file, 'utf8').catch(() => null);
if (process.argv.includes('--public')) {
  if (!existing) { console.error(`No key at ${file}. Run without --public to make one.`); process.exit(1); }
  process.stdout.write(createPublicKey(createPrivateKey(existing)).export({ type: 'spki', format: 'pem' }));
  process.exit(0);
}
if (existing) { console.error(`There is already a key at ${file}. It stays: replacing it silences every MADRE that trusts it.`); process.exit(1); }

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
await mkdir(dir, { recursive: true, mode: 0o700 });
await writeFile(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
await chmod(file, 0o600);
const pem = publicKey.export({ type: 'spki', format: 'pem' }).trim();
const source = await readFile(target, 'utf8');
const line = /export const NOTICES_PUBLIC_KEY = (?:`[^`]*`|null);/;
if (!line.test(source)) throw new Error('src/notices-key.mjs has no NOTICES_PUBLIC_KEY to fill.');
await writeFile(target, source.replace(line, `export const NOTICES_PUBLIC_KEY = \`${pem}\`;`));
console.log(`Private key: ${file} (only you can read it; keep a copy somewhere safe, offline)`);
console.log('Public key written to src/notices-key.mjs as NOTICES_PUBLIC_KEY:');
console.log(pem);
