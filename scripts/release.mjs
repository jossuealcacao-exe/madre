#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Closes a version, the only way a number gets used: clean tree, suite and
// pack:check green, the changelog's "Sin publicar" section dated, package.json
// bumped, one commit, one tag, pushed, one GitHub release. Then it prints the
// publish command; npm publish needs the human's one-time code, so it stays
// in the human's terminal.
//
//   node scripts/release.mjs            # closes the version package.json names
//   node scripts/release.mjs 0.2.10     # closes that version instead
//   node scripts/release.mjs --dry-run  # says what it would do

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: options.quiet ? 'pipe' : 'inherit', ...options });
const out = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requested = args.find((arg) => /^\d+\.\d+\.\d+$/.test(arg));

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const version = requested ?? pkg.version;
const today = new Date().toISOString().slice(0, 10);
const fail = (message) => { console.error(`\n  MOTHER › ${message}\n`); process.exit(1); };

if (out('git', ['status', '--porcelain'])) fail('the tree is not clean. Commit or stash first.');
if (out('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') fail('release from main.');
if (out('git', ['tag', '-l', `v${version}`]) && !dryRun) fail(`v${version} already exists. A number is used once; pick the next.`);
const published = (() => { try { return out('npm', ['view', pkg.name, 'version']); } catch { return null; } })();
if (published === version) fail(`${version} is already on npm. Open the next number.`);

let changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
const openHeader = changelog.match(new RegExp(`^## ${version.replace(/\\./g, '\\.')} · Sin publicar.*$`, 'm'));
if (!openHeader) fail(`CHANGELOG.md has no "## ${version} · Sin publicar" section. Write what this version ships first.`);
// A version that says nothing is a version nobody can decide to take.
const openBody = changelog.slice(changelog.indexOf(openHeader[0]) + openHeader[0].length).split(/^## /m)[0];
if (!openBody.trim()) fail(`The ${version} section is empty. A release note is how someone decides whether to update.`);
// A minor version opens on what it brings, once, for everyone who updates (src/whats-new.mjs).
// A patch may go out without a sheet; a minor cannot, or the people it is for never hear of it.
const { notesFor } = await import('../src/whats-new.mjs');
// The English changelog (CHANGELOG.en.md, 2026-10-15) closes with the Spanish one: the same version
// open there, and something written in it, or English readers never hear what came.
let changelogEn = await readFile(resolve(root, 'CHANGELOG.en.md'), 'utf8').catch(() => null);
if (changelogEn === null) fail('CHANGELOG.en.md is missing. The English changelog closes with the Spanish one.');
const openHeaderEn = changelogEn.match(new RegExp(`^## ${version.replace(/\./g, '\\.')} · Unreleased.*$`, 'm'));
if (!openHeaderEn) fail(`CHANGELOG.en.md has no "## ${version} · Unreleased" section. Translate what this version ships first.`);
if (!changelogEn.slice(changelogEn.indexOf(openHeaderEn[0]) + openHeaderEn[0].length).split(/^## /m)[0].trim()) fail(`The ${version} section of CHANGELOG.en.md is empty.`);
if (/\.0$/.test(version) && !notesFor(version)) fail(`${version} has no "what's new" in src/whats-new.mjs. Write the few things this version brings, and where they are, before closing it.`);

console.log(`\nMADRE › closing ${pkg.name}@${version} · ${today}${dryRun ? ' · DRY RUN' : ''}\n`);
run('npm', ['test']);
run('npm', ['run', 'pack:check']);

if (dryRun) { console.log('\n  Dry run: would date the changelog, set package.json, commit, tag, push and create the release.\n'); process.exit(0); }

// Date this one and open the next in the same breath. Twice now a version went out and the
// fixes that followed minutes later landed inside a section that was already published — history
// being rewritten by hand, and a number in npm has to mean one code and only one. The next
// section is a patch by default; if what comes is a minor, renaming a heading is the whole job.
const [major, minor, patch] = version.split('.').map(Number);
const next = `${major}.${minor}.${patch + 1}`;
changelog = changelog.replace(openHeader[0], `## ${next} · Sin publicar\n\n## ${version} · ${today}`);
await writeFile(resolve(root, 'CHANGELOG.md'), changelog);
changelogEn = changelogEn.replace(openHeaderEn[0], `## ${next} · Unreleased\n\n## ${version} · ${today}`);
await writeFile(resolve(root, 'CHANGELOG.en.md'), changelogEn);
if (pkg.version !== version) { pkg.version = version; await writeFile(resolve(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`); }
run('git', ['add', 'CHANGELOG.md', 'CHANGELOG.en.md', 'package.json']);
run('git', ['commit', '-q', '-m', `Release ${version}`]);
run('git', ['tag', '-a', `v${version}`, '-m', `MADRE ${version}`]);
run('git', ['push', '-q', 'origin', 'main']);
run('git', ['push', '-q', 'origin', `v${version}`]);

// The version's section of a changelog. GitHub refuses release notes over 125 000 characters, and
// 1.0's folded log went past them: the notes stop before a folded log and point at the file.
const sectionOf = (text, file, rest) => {
  const section = text.slice(text.indexOf(`## ${version} · ${today}`));
  let body = section.slice(section.indexOf('\n') + 1, section.indexOf('\n## ', 1) > 0 ? section.indexOf('\n## ', 1) : undefined).trim();
  if (body.length > 60000) {
    const fold = body.search(/\n### [^\n]*\n+<details>/);
    const anchor = `${version}--${today}`.replace(/\./g, '');
    body = `${(fold > 0 ? body.slice(0, fold) : body.slice(0, 55000)).trim()}\n\n${rest} [${file}](https://github.com/jossuealcacao-exe/madre/blob/main/${file}#${anchor}).`;
  }
  return body;
};
const body = sectionOf(changelog, 'CHANGELOG.md', 'El registro completo de esta versión está en el');
const bodyEn = sectionOf(changelogEn, 'CHANGELOG.en.md', 'The full log of this version is in');
// 1.0 left the names borrowed from Alien (docs/MACROVERSO-TRASPASO.md §1·c): the notes open with
// the version itself, and end on the command that opens Home. Spanish first, then English.
// A version with its own pictures (docs/media/<version>/, 2026-10-21) opens each language with the
// tour's thumbnail, linked to the video, and the how-it-works picture, read from the tag so they
// never change under the release.
const media = (lang, alt) => {
  if (!existsSync(resolve(root, 'docs/media', version, lang, 'video.webp'))) return '';
  const raw = `https://raw.githubusercontent.com/jossuealcacao-exe/madre/v${version}/docs/media/${version}`;
  const blob = `https://github.com/jossuealcacao-exe/madre/blob/v${version}/docs/media/${version}`;
  return `<p align="center"><a href="${blob}/madre-tour-${lang}.mp4"><img src="${raw}/${lang}/video.webp" alt="${alt[0]}" width="100%"></a></p>\n<p align="center"><img src="${raw}/${lang}/how.webp" alt="${alt[1]}" width="100%"></p>\n\n`;
};
const mediaEs = media('es', ['Mira cómo se usa MADRE', 'Cómo funciona MADRE: tus IAs, un chat, permisos, memoria y deshacer, en tu computadora']);
const mediaEn = media('en', ['See how MADRE works', 'How MADRE works: your AIs, one chat, permissions, memory and undo, on your computer']);
const notes = `${mediaEs}${body}\n\n---\n\n### English\n\n${mediaEn}${bodyEn}\n\n---\n\n\`\`\`\nnpx ${pkg.name}@${version}\n\`\`\`\n`;
await writeFile(resolve(root, '.release-notes.tmp.md'), notes);
try { run('gh', ['release', 'create', `v${version}`, '--title', `MADRE ${version}`, '--notes-file', '.release-notes.tmp.md', '--latest']); }
catch { console.error('  (gh release failed; create it by hand from the tag)'); }
finally { run('rm', ['-f', '.release-notes.tmp.md']); }

console.log(`\n  ${version} is tagged, pushed and released. Now, in your terminal:\n\n    npm publish --access public\n\n  npm asks for the one-time code in the browser. Then the version is closed.\n`);
