// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE COMMUNITY MARKET'S CHECK (2026-10-28, docs/private/MODULOS-MERCADO-1.0.6.md, stage 3). A module
// somebody sends to the Market — a pull request to the public `madre-mercado` repository, curated: the
// author of MADRE reads it, signs it and publishes it — is checked here first, the same way on the
// sender's computer («Send to the Market» in a module's card), in the repository's CI and in
// scripts/market-publish.mjs before it is signed:
//   · it loads alone, as MADRE loads any module before installing it (verifyModuleText), says it is
//     the module its entry names, at the same version, and speaks a contract this MADRE knows;
//   · its entry says what the Market shows (name, line and summary in Spanish and English, a shelf,
//     its author and the license of its code) and is free — paid community modules come later (D-M4);
//   · and what it declares, next to what its code reaches for (commands, the network, files, the
//     environment, code built at run time), is written out so reviewing it takes minutes.
// Nothing here runs the module beyond loading it: what a module does when it is used is for the
// reviewer to read, which is why the summary says what it reaches for.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { t } from './i18n.mjs';
import { verifyModuleText } from './modules/index.mjs';

// Where community modules are sent: a pull request adding modulos/<id>/ to this repository.
export const MARKET_REPO = 'jossuealcacao-exe/madre-mercado';
// GitHub's own page to add files to that folder: for whoever cannot write in the repository it makes
// the fork and the pull request itself, so sending a module needs no terminal.
export const uploadUrl = (id) => `https://github.com/${MARKET_REPO}/upload/main/modulos/${id}`;

export const COMMUNITY_ID = /^[a-z][a-z0-9-]{1,39}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const COLOR = /^#[0-9a-f]{6}$/i;
// The shelves of the Market (public/market.js, MARKET_SHELVES).
export const COMMUNITY_SHELVES = ['no-terminal', 'create', 'local-ai', 'connect'];
// Licenses a community module's code may carry: open ones a person can read, share and reuse.
// The author of MADRE decides this list with the terms for whoever publishes (D-M3, a draft).
export const COMMUNITY_LICENSES = ['AGPL-3.0-only', 'AGPL-3.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later', 'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0'];

// What the code reaches for, read from its text: what a reviewer looks at first.
const REACHES = [
  ['commands', 'runs commands on the computer', /child_process|\bspawn(?:Sync)?\s*\(|\bexec(?:File)?(?:Sync)?\s*\(|\bfork\s*\(/],
  ['network', 'talks to the network', /\bfetch\s*\(|node:https?|\bWebSocket\b|node:net|node:dgram|node:tls/],
  ['files', 'reads or writes files', /node:fs|\breadFile|\bwriteFile|\bappendFile|\bunlink|\brmSync|\brm\s*\(|\bmkdir/],
  ['environment', 'reads environment variables', /process\.env/],
  ['dynamic', 'builds or loads code at run time', /\beval\s*\(|new\s+Function\s*\(|\bimport\s*\(|\brequire\s*\(/],
  ['process', 'touches the MADRE process', /process\.(?:exit|kill|chdir|on\s*\()/],
];
export function reachesOf(text) {
  return REACHES.filter(([, , pattern]) => pattern.test(String(text ?? ''))).map(([id, words]) => ({ id, words: t(words) }));
}

const words = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
const both = (value, max) => value && typeof value === 'object' && words(value.es, max) && words(value.en, max);

// The entry the Market shows, as the sender wrote it: what is missing or wrong, in plain words, each
// with the field it is about (the form in a module's card marks that field).
export const entryProblems = (entry, module = null) => entryFaults(entry, module).map((one) => one.words);
export function entryFaults(entry, module = null) {
  const wrong = [];
  const say = (field, words) => wrong.push({ field, words });
  if (!entry || typeof entry !== 'object') return [{ field: 'entry', words: t('The entry is missing: entrada.json, beside the module.') }];
  if (!COMMUNITY_ID.test(entry.id ?? '')) say('id', t('id: lowercase letters, numbers and dashes, 2 to 40, starting with a letter.'));
  if (module && entry.id !== module.id) say('id', t('id: the entry says "{entry}" and the module says "{module}".', { entry: entry.id, module: module.id }));
  if (!SEMVER.test(entry.version ?? '')) say('version', t('version: like 1.0.0.'));
  if (module && entry.version !== module.version) say('version', t('version: the entry says {entry} and the module says {module}.', { entry: entry.version, module: module.version ?? t('nothing') }));
  if (!both(entry.name, 60)) say('name', t('name: in Spanish and English (es, en), up to 60 characters each.'));
  if (!both(entry.line, 140)) say('line', t('line: what it does in one line, in Spanish and English, up to 140 characters.'));
  if (!both(entry.summary, 1200)) say('summary', t('summary: what it does and when to use it, in Spanish and English, up to 1200 characters.'));
  if (!COMMUNITY_SHELVES.includes(entry.shelf)) say('shelf', t('shelf: one of {list}.', { list: COMMUNITY_SHELVES.join(', ') }));
  if (entry.price !== undefined && entry.price !== 0) say('price', t('price: community modules are free for now (0).'));
  if (!SEMVER.test(entry.minMadre ?? '')) say('minMadre', t('minMadre: the oldest MADRE it works with, like 1.1.0.'));
  if (!words(entry.author?.name, 60) || !GITHUB.test(entry.author?.github ?? '')) say('author', t('author: { "name": your name, "github": your GitHub user }.'));
  if (!COMMUNITY_LICENSES.includes(entry.spdx)) say('spdx', t('spdx: the license of its code, one of {list}.', { list: COMMUNITY_LICENSES.join(', ') }));
  if (entry.changes !== undefined && !both(entry.changes, 400)) say('changes', t('changes: what changed in this version, in Spanish and English, up to 400 characters.'));
  if (entry.hue !== undefined && !(Array.isArray(entry.hue) && entry.hue.length === 2 && entry.hue.every((one) => COLOR.test(one)))) say('hue', t('hue: two colors like ["#60a5fa", "#1d4ed8"].'));
  if (entry.icon !== undefined) {
    if (typeof entry.icon !== 'string' || entry.icon.length > 8000) say('icon', t('icon: the shapes of a 20×20 drawing, up to 8000 characters.'));
    else if (/<script|\son\w+\s*=|javascript:|<foreignObject|href\s*=/i.test(entry.icon)) say('icon', t('icon: only shapes; no scripts, events or links.'));
  }
  return wrong;
}

// Everything at once: the module, its entry and what it reaches for, and the summary for a person.
export async function checkSubmission({ text, entry, name = null }) {
  const faults = [];
  let module = null;
  try {
    module = await verifyModuleText({ text, name: name ?? `${entry?.id ?? 'module'}.mjs`, replace: true });
  } catch (error) {
    faults.push({ field: 'module', words: t('The module does not load as MADRE loads one: {error}', { error: error.message }) });
  }
  faults.push(...entryFaults(entry, module));
  const problems = faults.map((one) => one.words);
  const reaches = reachesOf(text);
  const declares = module?.declares ?? null;
  // What the code reaches for and the module never declared: the first thing to ask its author.
  const undeclared = [];
  if (reaches.some((one) => one.id === 'network') && !(declares?.reaches ?? []).length) undeclared.push(t('It talks to the network but declares no `reaches`: say where it goes and why.'));
  const result = { ok: problems.length === 0, problems, faults, fields: [...new Set(faults.map((one) => one.field))], undeclared, module: module ? { id: module.id, name: module.name, version: module.version, unknown: module.unknown ?? [] } : null, declares, reaches };
  return { ...result, markdown: submissionMarkdown(result, entry) };
}

// The summary a reviewer reads in the pull request (the CI writes it to the job's summary).
export function submissionMarkdown(result, entry = {}) {
  const lines = [];
  const title = entry?.name?.es ?? result.module?.name ?? entry?.id ?? 'module';
  lines.push(`## ${result.ok ? '✅' : '❌'} ${title} ${result.module?.version ?? entry?.version ?? ''}`.trim());
  if (entry?.author?.github) lines.push(t('By **{name}** (@{github}) · {license} · shelf `{shelf}`', { name: entry.author.name ?? entry.author.github, github: entry.author.github, license: entry.spdx ?? t('no license'), shelf: entry.shelf ?? '—' }));
  if (result.problems.length) {
    lines.push('', `### ${t('To fix before it can be reviewed')}`);
    for (const one of result.problems) lines.push(`- ${one}`);
  }
  const declares = result.declares;
  if (declares) {
    const yes = (value) => (value ? t('yes') : t('no'));
    lines.push('', `### ${t('What it declares')}`);
    lines.push(`- ${t('Reaches: {list}', { list: declares.reaches.length ? declares.reaches.map((one) => `${one.host ?? one.to ?? '?'}${one.what ? ` (${one.what})` : ''}`).join(', ') : t('nothing') })}`);
    lines.push(`- ${t('Keys it asks for: {list}', { list: declares.secrets.length ? declares.secrets.map((one) => one.label).join(', ') : t('nothing') })}`);
    lines.push(`- ${t('Tools for the agents: {tools} · reads the conversations: {reads} · pages: {pages} · writes in the project: {writes}', { tools: yes(declares.tools), reads: yes(declares.reads), pages: declares.pages, writes: yes(declares.writes) })}`);
    lines.push(`- ${t('Commands: {list}', { list: declares.commands.length ? declares.commands.join(', ') : t('nothing') })}`);
  }
  lines.push('', `### ${t('What its code reaches for')}`);
  lines.push(result.reaches.length ? result.reaches.map((one) => `- ${one.words}`).join('\n') : `- ${t('Nothing beyond what MADRE hands every module.')}`);
  for (const one of result.undeclared) lines.push(`- ⚠️ ${one}`);
  if (result.module?.unknown?.length) lines.push(`- ⚠️ ${t('Fields MADRE does not know: {list}', { list: result.module.unknown.join(', ') })}`);
  lines.push('', `_${t('Checked by MADRE (src/market-check.mjs). A person still reads the code before it is signed: a module runs with the permissions of whoever opens MADRE.')}_`);
  return lines.join('\n');
}

// SENDING ONE'S OWN MODULE («Send to the Market» in its card). The entry starts from what the module
// already says — its id, version, name and what it does, in both languages when it wrote both — and
// from what the person wrote the last time; the rest (the shelf, who they are on GitHub, the license
// of their code) is theirs to say. Ready, the module and its entry are written to a folder of their
// own, the two files the repository asks for, to add with GitHub's page.
export const submissionFolder = (stateRoot, id) => join(stateRoot, 'market', 'submissions', id);
const bilingual = (value) => (value && typeof value === 'object' ? { es: value.es ?? value.en ?? '', en: value.en ?? value.es ?? '' } : { es: String(value ?? ''), en: String(value ?? '') });
const firstLine = (text) => String(text ?? '').split(/(?<=[.!?])\s/)[0].slice(0, 140);
export async function submissionDraft({ stateRoot, module, text, madre, entry = null }) {
  const saved = entry ?? (await readFile(join(submissionFolder(stateRoot, module.id), 'entrada.json'), 'utf8').then(JSON.parse).catch(() => null)) ?? {};
  let checked = null;
  try { checked = await verifyModuleText({ text, name: `${module.id}.mjs`, replace: true }); } catch { /* said by the check */ }
  const summary = bilingual(checked?.words?.summary ?? checked?.summary ?? module.summary ?? '');
  const draft = {
    id: module.id,
    version: checked?.version ?? module.version ?? '',
    name: bilingual(checked?.words?.name ?? checked?.name ?? module.name ?? module.id),
    line: { es: firstLine(summary.es), en: firstLine(summary.en) },
    summary,
    shelf: '',
    minMadre: madre ?? '',
    author: { name: checked?.credit ?? '', github: '' },
    spdx: '',
  };
  // What the person wrote wins, field by field; the id and the version are always the module's.
  const merged = { ...draft, ...saved, id: draft.id, version: draft.version };
  for (const key of ['name', 'line', 'summary']) merged[key] = { ...draft[key], ...(saved[key] ?? {}) };
  merged.author = { ...draft.author, ...(saved.author ?? {}) };
  return merged;
}
export async function writeSubmission({ stateRoot, text, entry }) {
  const folder = submissionFolder(stateRoot, entry.id);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, `${entry.id}.module.mjs`), text);
  await writeFile(join(folder, 'entrada.json'), `${JSON.stringify(entry, null, 2)}\n`);
  return { folder, files: [`${entry.id}.module.mjs`, 'entrada.json'], upload: uploadUrl(entry.id) };
}
