#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
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
//
// A NEWER FILE FOR ONE OF MADRE'S OWN MODULES (2026-10-25) goes in `builtins`, not in `modules`:
// `{ id, version, file, changes }`. It is checked as MADRE checks it, signed with the FACTORY key as
// well (~/.madre/fabrica/ed25519.pem, scripts/market-key.mjs --fabrica; --factory-key <pem>), and
// every MADRE that understands its contract runs it instead of its own (src/builtin-updates.mjs).
// `revoked` takes a module, or one version of it, back: `{ id, version?, why }`.
//
// THE COMMUNITY'S MODULES (2026-10-28) come from the public `madre-mercado` repository (--community
// <folder>, by default ~/Pangea OS/madre-mercado when it is there): every `modulos/<id>/` merged there
// was read by the author first. Each is checked again here as its pull request was
// (src/market-check.mjs), and joins the catalog with `community: true`, its author and its license.

import { createPrivateKey, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readCatalog, sha256, verifySigned } from '../src/market-remote.mjs';
import { verifyBuiltinText, verifyModuleText } from '../src/modules/index.mjs';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';

// A community module is checked by loading it, and loading runs its code. Never here, where the
// Market's key is read and the factory's is a file away: in a node of its own that may read MADRE's
// code, the module's folder and a scratch folder of its own, and nothing else (Node's permission
// model) — not ~/.madre.
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function checkApart({ file, entryFile, id }) {
  const scratch = await realpath(await mkdtemp(join(tmpdir(), 'madre-community-check-')));
  const check = pathToFileURL(join(REPO, 'src', 'market-check.mjs')).href;
  const script = `import { readFile } from 'node:fs/promises';
const { checkSubmission } = await import(${JSON.stringify(check)});
const [file, entryFile, id] = process.argv.slice(1);
const result = await checkSubmission({ text: await readFile(file, 'utf8'), entry: JSON.parse(await readFile(entryFile, 'utf8')), name: id + '.mjs' });
process.stdout.write(JSON.stringify({ ok: result.ok, problems: result.problems }));`;
  try {
    const out = execFileSync(process.execPath, ['--permission', `--allow-fs-read=${REPO}`, `--allow-fs-read=${await realpath(dirname(file))}`, `--allow-fs-read=${scratch}`, `--allow-fs-write=${scratch}`, '--input-type=module', '-e', script, await realpath(file), await realpath(entryFile), id], { cwd: scratch, env: { PATH: process.env.PATH ?? '', HOME: scratch, TMPDIR: scratch }, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    return JSON.parse(out);
  } catch (error) {
    return { ok: false, problems: [`the check did not finish: ${String(error.stderr || error.message).trim().split('\n')[0]}`] };
  } finally { await rm(scratch, { recursive: true, force: true }); }
}

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at > 0 ? process.argv[at + 1] : fallback; };
const fallbackLanding = join(homedir(), 'Pangea OS', 'madre-landing');
const src = resolve(arg('src', join(fallbackLanding, 'mercado')));
const out = resolve(arg('out', join(fallbackLanding, 'site', 'mercado')));
const base = arg('base', 'https://madre.run/mercado').replace(/\/+$/, '');
const keyFile = arg('key', process.env.MADRE_MARKET_KEY || join(homedir(), '.madre', 'mercado', 'ed25519.pem'));
const factoryKeyFile = arg('factory-key', process.env.MADRE_FACTORY_KEY || join(homedir(), '.madre', 'fabrica', 'ed25519.pem'));

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
const fallbackCommunity = join(homedir(), 'Pangea OS', 'madre-mercado');
const community = arg('community', existsSync(join(fallbackCommunity, 'modulos')) ? fallbackCommunity : null);
if (community) {
  const ids = (await readdir(join(community, 'modulos'), { withFileTypes: true })).filter((one) => one.isDirectory() && !one.name.startsWith('.')).map((one) => one.name).sort();
  for (const id of ids) {
    if (modules.some((one) => one.id === id)) throw new Error(`${id}: the community's module has the id of one already in the Market.`);
    const file = join(community, 'modulos', id, `${id}.module.mjs`);
    const text = await readFile(file, 'utf8');
    const entryFile = join(community, 'modulos', id, 'entrada.json');
    const entry = JSON.parse(await readFile(entryFile, 'utf8'));
    const checked = await checkApart({ file, entryFile, id });
    if (!checked.ok) throw new Error(`${id} does not pass the community's check:\n- ${checked.problems.join('\n- ')}`);
    const bytes = Buffer.from(text);
    const name = `${id}-${entry.version}.module.mjs`;
    await copyFile(file, join(out, 'modulos', name));
    const { author, spdx, shelf, minMadre, version, name: title, line, summary, changes, hue, icon } = entry;
    modules.push({ id, community: true, author, spdx, shelf, scope: 'everywhere', price: 0, minMadre, version, name: title, line, summary, changes: changes ?? null, hue: hue ?? null, icon: icon ?? null, file: { url: `${base}/modulos/${name}`, sha256: sha256(bytes), size: bytes.length } });
  }
}
const builtins = [];
if ((source.builtins ?? []).length) {
  const factory = createPrivateKey(await readFile(factoryKeyFile, 'utf8'));
  for (const entry of source.builtins) {
    const bytes = await readFile(join(src, entry.file));
    const checked = await verifyBuiltinText({ text: bytes.toString('utf8'), id: entry.id });
    if (entry.version && entry.version !== checked.version) throw new Error(`${entry.file} says ${checked.version}; the source says ${entry.version}.`);
    const name = `${entry.id}-${checked.version}.builtin.mjs`;
    await copyFile(join(src, entry.file), join(out, 'modulos', name));
    builtins.push({ id: entry.id, version: checked.version, sdk: checked.sdk, changes: entry.changes ?? null, file: { url: `${base}/modulos/${name}`, sha256: sha256(bytes), size: bytes.length, factory: sign(null, bytes, factory).toString('base64') } });
  }
}
const catalog = { schema: 1, issued: new Date().toISOString(), shelves: source.shelves ?? [], featured: source.featured ?? [], news: source.news ?? [], modules, builtins, revoked: source.revoked ?? [] };
const bytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
const signature = sign(null, bytes, key).toString('base64');
await writeFile(join(out, 'catalogo.json'), bytes);
await writeFile(join(out, 'catalogo.json.sig'), `${signature}\n`);

// Read back as MADRE reads it: the key MADRE carries must verify it, and every entry must survive.
const { MARKET_PUBLIC_KEY } = await import('../src/market-key.mjs');
if (!verifySigned(bytes, signature, MARKET_PUBLIC_KEY)) throw new Error('The signature does not verify with the key in src/market-key.mjs: this is not the key MADRE carries.');
const read = readCatalog(bytes.toString('utf8'), { url: `${base}/catalogo.json` });
const { FACTORY_PUBLIC_KEY } = await import('../src/market-key.mjs');
for (const one of builtins) if (!FACTORY_PUBLIC_KEY || !verifySigned(await readFile(join(out, 'modulos', `${one.id}-${one.version}.builtin.mjs`)), one.file.factory, FACTORY_PUBLIC_KEY)) throw new Error(`${one.id}: the factory signature does not verify with the key in src/market-key.mjs.`);
const lost = [...catalog.modules.filter((one) => !read.modules.some((kept) => kept.id === one.id)), ...builtins.filter((one) => !read.builtins.some((kept) => kept.id === one.id))].map((one) => one.id);
if (lost.length) throw new Error(`MADRE would leave out: ${lost.join(', ')}.`);
console.log(`✓ ${out}/catalogo.json · ${read.modules.length} modules (${read.modules.filter((one) => one.file).length} with a file, ${read.modules.filter((one) => one.community).length} of the community) · ${read.builtins.length} newer of MADRE's own · ${read.revoked.length} taken back · issued ${catalog.issued}`);
console.log('  Signed and verified. Publish madre.run as usual to put it online.');
