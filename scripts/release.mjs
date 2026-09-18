#!/usr/bin/env node
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

console.log(`\nMU/TH/UR › closing ${pkg.name}@${version} · ${today}${dryRun ? ' · DRY RUN' : ''}\n`);
run('npm', ['test']);
run('npm', ['run', 'pack:check']);

if (dryRun) { console.log('\n  Dry run: would date the changelog, set package.json, commit, tag, push and create the release.\n'); process.exit(0); }

changelog = changelog.replace(openHeader[0], `## ${version} · ${today}`);
await writeFile(resolve(root, 'CHANGELOG.md'), changelog);
if (pkg.version !== version) { pkg.version = version; await writeFile(resolve(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`); }
run('git', ['add', 'CHANGELOG.md', 'package.json']);
run('git', ['commit', '-q', '-m', `Release ${version}`]);
run('git', ['tag', '-a', `v${version}`, '-m', `MADRE ${version}`]);
run('git', ['push', '-q', 'origin', 'main']);
run('git', ['push', '-q', 'origin', `v${version}`]);

const section = changelog.slice(changelog.indexOf(`## ${version} · ${today}`));
const body = section.slice(section.indexOf('\n') + 1, section.indexOf('\n## ', 1) > 0 ? section.indexOf('\n## ', 1) : undefined).trim();
const notes = `\`\`\`\nMU/TH/UR 6000 · INTERFACE 2037 · MADRE ${version} IS READY\n\`\`\`\n\n${body}\n\n---\n\n\`\`\`\nnpx ${pkg.name}@${version} start\n\`\`\`\n`;
await writeFile(resolve(root, '.release-notes.tmp.md'), notes);
try { run('gh', ['release', 'create', `v${version}`, '--title', `MADRE ${version} · MU/TH/UR 6000`, '--notes-file', '.release-notes.tmp.md', '--latest']); }
catch { console.error('  (gh release failed; create it by hand from the tag)'); }
finally { run('rm', ['-f', '.release-notes.tmp.md']); }

console.log(`\n  ${version} is tagged, pushed and released. Now, in your terminal:\n\n    npm publish --access public\n\n  npm asks for the one-time code in the browser. Then the version is closed.\n`);
