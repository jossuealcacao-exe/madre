#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Builds MADRE's installer for Windows (installer/windows/madre.nsi) with makensis (NSIS 3): first
// the launcher MADRE.exe, then the installer that carries it. Runs on macOS (brew install makensis)
// and on Linux (apt install nsis); Windows is not needed to build it, only to try it.
//
//   node scripts/windows-installer.mjs          # → out/windows/MADRE-Instalador.exe
//   node scripts/windows-installer.mjs --icon   # also redraws madre.ico from the app icon (macOS)
//
// The installer installs the MADRE that npm has as latest at the time it runs, never a copy of its
// own: the same file keeps working across versions, and the version in it is only its label.

import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = join(root, 'installer', 'windows');
const out = join(root, 'out', 'windows');
// The label it carries: package.json's, or the one release.mjs is closing (`--version 1.1.1`), which
// is built before package.json moves.
const asked = process.argv[process.argv.indexOf('--version') + 1];
const version = process.argv.includes('--version') && /^\d+\.\d+\.\d+$/.test(asked ?? '') ? asked : JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;

// An .ico of PNG images (Windows Vista and later read them): 16, 32, 48 and 256 pixels, from the
// app icon, with macOS's sips. Kept in the repository, so building elsewhere needs no sips.
async function drawIcon() {
  const work = await mkdtemp(join(tmpdir(), 'madre-ico-'));
  const sizes = [16, 32, 48, 256];
  const images = [];
  for (const size of sizes) {
    const file = join(work, `${size}.png`);
    execFileSync('sips', ['-z', String(size), String(size), join(root, 'public', 'assets', 'brand', 'madre-app-512.png'), '--out', file], { stdio: 'pipe' });
    images.push(await readFile(file));
  }
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach((image, index) => {
    const at = 6 + 16 * index;
    const size = sizes[index] === 256 ? 0 : sizes[index];
    head.writeUInt8(size, at);
    head.writeUInt8(size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(image.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += image.length;
  });
  await writeFile(join(source, 'madre.ico'), Buffer.concat([head, ...images]));
  await rm(work, { recursive: true, force: true });
}

if (process.argv.includes('--icon')) await drawIcon();

// makensis reads every File from its working folder: the pieces go together in one.
const build = await mkdtemp(join(tmpdir(), 'madre-nsis-'));
for (const file of ['madre.nsi', 'launcher.nsi', 'inside-setup.sh', 'madre.ico']) await copyFile(join(source, file), join(build, file));
// makensis on macOS and Linux reads the accents of the Spanish texts only under a UTF-8 locale.
const nsis = (script, defines = []) => execFileSync('makensis', ['-V2', '-INPUTCHARSET', 'UTF8', ...defines, script], { cwd: build, stdio: 'inherit', env: { ...process.env, LC_ALL: process.platform === 'linux' ? 'C.UTF-8' : 'en_US.UTF-8' } });
nsis('launcher.nsi');
nsis('madre.nsi', [`-DVERSION=${version}`, '-DOUTFILE=MADRE-Instalador.exe']);
await mkdir(out, { recursive: true });
await copyFile(join(build, 'MADRE-Instalador.exe'), join(out, 'MADRE-Instalador.exe'));
await rm(build, { recursive: true, force: true });
console.log(`\nMADRE ${version} · ${join('out', 'windows', 'MADRE-Instalador.exe')}\n`);
