#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Publishing the Market (2026-10-18). Reads the catalog's source — catalogo.json and the module
// files beside it — and writes what madre.run serves: the catalog with every file pinned by its
// sha256 and size, each file under a name that carries its version (a published file never
// changes), and the Ed25519 signature of the catalog's exact bytes, made with the key only the
// author holds (scripts/market-key.mjs). Then it checks the result the way MADRE will.
//
//   node scripts/market-publish.mjs [--src <folder>] [--out <folder>] [--base <url>] [--key <pem>]
//
// Defaults: the landing next to this repository (madre-landing/mercado → madre-landing/site/mercado)
// and https://madre.run/mercado. Nothing is deployed: madre.run is published the way it always is.
//
// In the source, a module MADRE already carries is an entry with its words and drawings only; a
// new one adds `version` and `file` (the path of its .module.mjs, relative to the source folder).

import { createPrivateKey, sign } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readCatalog, sha256, verifySigned } from '../src/market-remote.mjs';
import { verifyModuleText } from '../src/modules/index.mjs';

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at > 0 ? process.argv[at + 1] : fallback; };
const fallbackLanding = join(homedir(), 'Pangea OS', 'madre-landing');
const src = resolve(arg('src', join(fallbackLanding, 'mercado')));
const out = resolve(arg('out', join(fallbackLanding, 'site', 'mercado')));
const base = arg('base', 'https://madre.run/mercado').replace(/\/+$/, '');
const keyFile = arg('key', process.env.MADRE_MARKET_KEY || join(homedir(), '.madre', 'mercado', 'ed25519.pem'));

const source = JSON.parse(await readFile(join(src, 'catalogo.json'), 'utf8'));
const key = createPrivateKey(await readFile(keyFile, 'utf8'));
await mkdir(join(out, 'modulos'), { recursive: true });

const modules = [];
for (const entry of source.modules ?? []) {
  if (!entry.file) { modules.push(entry); continue; }
  if (!/^\d+\.\d+\.\d+$/.test(entry.version ?? '')) throw new Error(`${entry.id}: a module with a file needs a version like 1.0.0.`);
  const bytes = await readFile(join(src, entry.file));
  // The same check MADRE makes before it installs: a file that would be refused there is refused here.
  const checked = await verifyModuleText({ text: bytes.toString('utf8'), name: `${entry.id}.mjs`, replace: true });
  if (checked.id !== entry.id) throw new Error(`${entry.file} says it is "${checked.id}", not "${entry.id}".`);
  const name = `${entry.id}-${entry.version}.module.mjs`;
  await copyFile(join(src, entry.file), join(out, 'modulos', name));
  modules.push({ ...entry, file: { url: `${base}/modulos/${name}`, sha256: sha256(bytes), size: bytes.length } });
}
const catalog = { schema: 1, issued: new Date().toISOString(), shelves: source.shelves ?? [], featured: source.featured ?? [], news: source.news ?? [], modules };
const bytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
const signature = sign(null, bytes, key).toString('base64');
await writeFile(join(out, 'catalogo.json'), bytes);
await writeFile(join(out, 'catalogo.json.sig'), `${signature}\n`);

// Read back as MADRE reads it: the key MADRE carries must verify it, and every entry must survive.
const { MARKET_PUBLIC_KEY } = await import('../src/market-key.mjs');
if (!verifySigned(bytes, signature, MARKET_PUBLIC_KEY)) throw new Error('The signature does not verify with the key in src/market-key.mjs: this is not the key MADRE carries.');
const read = readCatalog(bytes.toString('utf8'), { url: `${base}/catalogo.json` });
const lost = catalog.modules.filter((one) => !read.modules.some((kept) => kept.id === one.id)).map((one) => one.id);
if (lost.length) throw new Error(`MADRE would leave out: ${lost.join(', ')}.`);
console.log(`✓ ${out}/catalogo.json · ${read.modules.length} modules (${read.modules.filter((one) => one.file).length} with a file) · issued ${catalog.issued}`);
console.log('  Signed and verified. Publish madre.run as usual to put it online.');
