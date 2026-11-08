// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// SKILLS (2026-11-08, H-1 of docs/private/HABILIDADES-MERCADO.md). A skill is a way of working that
// MADRE hands to whichever agent answers. A module adds buttons and pages and runs on this computer;
// a skill only tells an agent how to do something — and because MADRE is the one that writes the
// prompt (src/room/prompt.mjs), the same skill works on all six agents. A skill of Claude's works
// only in Claude; Codex has its own prompts, Gemini its commands, OpenCode its agents. MADRE already
// keeps every one of those out of a turn on purpose (--setting-sources '' and no Skill tool for
// Claude, --pure for OpenCode, --ephemeral for Codex, SKILLS_ENABLED=false for Grok), so what a
// person already had never reached the room. This is the hole that fills.
//
//   <folder>/<id>/HABILIDAD.md   its header and its instructions. SKILL.md is read the same way, so
//                                a skill a person already has is imported without being rewritten.
//   <folder>/<id>/referencias/   what the agent reads when it needs it: templates, examples, data.
//   <folder>/<id>/guiones/       what an agent MAY RUN, and only at #4.
//
// Two folders, the same two a module has: ~/.pulse/habilidades (every project) and
// <project>/.madre/habilidades (this one). Agents never write in either — .madre/ is a forbidden
// zone and ~/.pulse lives outside every project — so a skill is proposed by an agent and installed
// by the person, like a module.
//
// WHAT CONTAINS A SKILL. The body travels in the prompt, so it is capped: what does not fit goes in
// referencias/ and the agent reads it when it needs it, which is how skills work everywhere. A
// script is never run by MADRE: an agent runs it, with the permission of its turn, so below #4 no
// agent can run anything at all and every script is inert on its own. Nothing is read from outside
// the skill's own folder: no symlinks, no paths that climb out, no hidden files.

import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { t } from './i18n.mjs';

export const SKILL_FILES = ['HABILIDAD.md', 'SKILL.md'];
export const ID = /^[a-z][a-z0-9-]{1,39}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
// The body is in every turn this skill enters, so it is the one thing with a tight cap: about two
// thousand tokens. A skill with more to say puts it in referencias/ and points at it.
export const MAX_BODY = 8000;
export const MAX_WHEN = 400;
export const MAX_NAME = 60;
export const MAX_FILES = 40;
export const MAX_BYTES = 512 * 1024;
// What an agent could run, and therefore what only #4 could ever reach. Read from the name, and
// from the executable bit for anything else.
const RUNNABLE = /\.(?:sh|bash|zsh|py|rb|pl|mjs|cjs|js|ts)$/i;

export const skillFolders = ({ stateRoot, projectRoot }) => ({
  user: join(stateRoot, 'habilidades'),
  project: join(projectRoot, '.madre', 'habilidades'),
});

// The header between the first two «---» lines, one «key: value» per line, as a skill of Claude's
// has it and as madre-logs has it. A value may be plain, quoted, or the two languages at once:
// `name: { es: "Cotizaciones", en: "Quotes" }`.
export function readHeader(text) {
  const match = String(text ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at <= 0 || /^\s/.test(line)) continue;
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}
export const bodyOf = (text) => String(text ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

const unquote = (value) => String(value ?? '').trim().replace(/^(["'])([\s\S]*)\1$/, '$2').trim();
// One word or the two languages. `{ es: "…", en: "…" }` is read without a YAML reader: a header is
// one line per field and this is the only shape of value that is not plain text.
export function words(value, max) {
  const said = String(value ?? '').trim();
  if (!said) return null;
  if (said.startsWith('{')) {
    const out = {};
    for (const lang of ['es', 'en']) {
      const hit = said.match(new RegExp(`\\b${lang}\\s*:\\s*(?:"([^"]*)"|'([^']*)'|([^,}]*))`));
      const one = unquote(hit?.[1] ?? hit?.[2] ?? hit?.[3] ?? '');
      if (one) out[lang] = one.slice(0, max);
    }
    return Object.keys(out).length ? out : null;
  }
  return unquote(said).slice(0, max) || null;
}
// Whichever language the room speaks, for a name that may be one word or two.
export const pick = (value, language = 'es') => (value && typeof value === 'object' ? value[language] ?? value.es ?? value.en ?? null : value ?? null);

// WHAT A SKILL DECLARES. English keys, as a module's contract has them, with the Spanish ones a
// person writing by hand will reach for, and the ones a skill of Claude's already carries:
// `description` is its `when`. MADRE's own words are in English and the room speaks the person's
// language (src/i18n.mjs), here as everywhere.
const KEYS = { id: ['id'], name: ['name', 'nombre'], when: ['when', 'cuando', 'description'], version: ['version', 'versión'], minMadre: ['minMadre', 'minmadre'], credit: ['credit', 'credito', 'crédito'], license: ['license', 'licencia'] };
export const KNOWN = new Set(Object.values(KEYS).flat());
const field = (fields, key) => KEYS[key].map((name) => fields[name]).find((value) => String(value ?? '').trim());

// One skill read from its text, with what is wrong said in words the person can act on. The id is
// the folder's name when the header does not say one, so importing a skill of Claude's — which
// names no id — works as it is.
export function readSkillText(text, { id = null } = {}) {
  const fields = readHeader(text);
  if (!fields) throw new Error(t('A skill starts with its header between two «---» lines: id, name and when it is for.'));
  const said = unquote(field(fields, 'id') ?? '') || String(id ?? '');
  if (!ID.test(said)) throw new Error(t('«{id}» is not a name MADRE can use for a skill: lowercase letters, numbers and dashes, 2 to 40, starting with a letter.', { id: said || '—' }));
  const body = bodyOf(text);
  if (!body) throw new Error(t('The skill says nothing: under the header go the instructions the agents will read.'));
  if (body.length > MAX_BODY) throw new Error(t('The skill is too long ({has} characters, at most {max}). What does not fit goes in referencias/, and the instructions point at it: the agent reads it when it needs it.', { has: body.length, max: MAX_BODY }));
  const version = unquote(field(fields, 'version') ?? '');
  if (version && !SEMVER.test(version)) throw new Error(t('version: like 1.0.0.'));
  const minMadre = unquote(field(fields, 'minMadre') ?? '');
  if (minMadre && !SEMVER.test(minMadre)) throw new Error(t('minMadre: the oldest MADRE it works with, like 1.1.0.'));
  return {
    id: said,
    name: words(field(fields, 'name'), MAX_NAME) ?? said,
    // Without it, the skill only ever enters a turn because the person turned it on.
    when: words(field(fields, 'when'), MAX_WHEN),
    version: version || null,
    minMadre: minMadre || null,
    credit: words(field(fields, 'credit'), MAX_NAME),
    license: unquote(field(fields, 'license') ?? '') || null,
    body,
    // Said, never ignored in silence, as a module's unknown fields are said when it is installed.
    unknown: Object.keys(fields).filter((key) => !KNOWN.has(key)),
  };
}

// EVERY FILE OF A SKILL, and nothing else. A link is not followed and a file that is not under the
// skill's own folder is not read: a skill travels, and what travels names its own paths.
export async function readSkillFiles(dir, { maxFiles = MAX_FILES, maxBytes = MAX_BYTES } = {}) {
  const root = resolve(dir);
  const files = [];
  let bytes = 0;
  const walk = async (at) => {
    for (const entry of (await readdir(at, { withFileTypes: true }).catch(() => []))) {
      if (entry.name.startsWith('.')) continue;
      const path = join(at, entry.name);
      const info = await lstat(path).catch(() => null);
      if (!info) continue;
      if (info.isSymbolicLink()) throw new Error(t('{file} is a link, and a skill carries only its own files.', { file: relative(root, path) }));
      const inside = resolve(path);
      if (inside !== root && !inside.startsWith(root + sep)) throw new Error(t('{file} is outside the skill\'s folder.', { file: entry.name }));
      if (info.isDirectory()) { await walk(path); continue; }
      if (!info.isFile()) continue;
      files.push({ path: relative(root, path), bytes: info.size, runs: RUNNABLE.test(entry.name) || Boolean(info.mode & 0o111) });
      bytes += info.size;
      if (files.length > maxFiles) throw new Error(t('A skill carries at most {max} files.', { max: maxFiles }));
      if (bytes > maxBytes) throw new Error(t('A skill weighs at most {max} KB.', { max: Math.round(maxBytes / 1024) }));
    }
  };
  await walk(root);
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), bytes };
}

// One skill from a folder on this computer: its text, its files, and the scripts an agent could only
// ever run at #4. Nothing is run here, and nothing is installed: asking what a folder is must not
// change anything.
export async function readSkill(dir, { origin = null } = {}) {
  const root = resolve(dir);
  let text = null;
  let from = null;
  for (const candidate of SKILL_FILES) {
    text = await readFile(join(root, candidate), 'utf8').catch(() => null);
    if (text !== null) { from = candidate; break; }
  }
  if (text === null) throw new Error(t('{folder} has no {file}.', { folder: basename(root), file: SKILL_FILES[0] }));
  const skill = readSkillText(text, { id: basename(root) });
  const { files, bytes } = await readSkillFiles(root);
  return { ...skill, dir: root, file: join(root, from), origin, files, bytes, scripts: files.filter((one) => one.runs).map((one) => one.path) };
}

// WHAT A SKILL SAYS IT DOES, for the person to read before accepting it (H-3). Only what is there:
// when it says it is for, how long what it tells the agents is, what it carries, and every script —
// because a script is the one thing that could ever run, and only at #4.
export const declaredBy = (skill) => ({
  when: skill.when ?? null,
  chars: skill.body.length,
  files: skill.files.length,
  references: skill.files.filter((one) => !one.runs).map((one) => one.path),
  scripts: skill.scripts,
  credit: skill.credit ?? null,
  license: skill.license ?? null,
});

// Every skill of both folders, newest reading each time. One that cannot be read is left out with
// why, as a module that fails to load is: a bad skill never keeps the others out of the room.
export async function loadSkills({ stateRoot, projectRoot }) {
  const folders = skillFolders({ stateRoot, projectRoot });
  const loaded = [];
  const failures = [];
  for (const [origin, dir] of Object.entries(folders)) {
    for (const entry of (await readdir(dir, { withFileTypes: true }).catch(() => []))) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const at = join(dir, entry.name);
      try {
        const skill = await readSkill(at, { origin });
        // A skill of this project stands in for one of the same name from every project, the way
        // installing a newer copy of a module replaces it.
        const already = loaded.findIndex((one) => one.id === skill.id);
        if (already >= 0) loaded[already] = skill; else loaded.push(skill);
      } catch (error) {
        failures.push({ dir: at, origin, error: error.message });
      }
    }
  }
  return { loaded: loaded.sort((a, b) => a.id.localeCompare(b.id)), failures, folders };
}

// INSTALLING ONE. The files are checked before a single one is written, and written to a folder of
// the skill's own name: a skill is never spread over the folder of another. `files` is what the
// person accepted — its text and whatever came with it — each path relative to the skill's folder.
export async function installSkill({ files, scope = 'user', stateRoot, projectRoot, source = null }) {
  const main = files.find((one) => SKILL_FILES.includes(one.path));
  if (!main) throw new Error(t('A skill needs its {file}.', { file: SKILL_FILES[0] }));
  const folders = skillFolders({ stateRoot, projectRoot });
  const dir = folders[scope === 'project' ? 'project' : 'user'];
  const skill = readSkillText(main.text ?? main.content ?? '', { id: source?.id ?? null });
  if (files.length > MAX_FILES) throw new Error(t('A skill carries at most {max} files.', { max: MAX_FILES }));
  const safe = [];
  let bytes = 0;
  for (const one of files) {
    const path = String(one.path ?? '');
    // The paths come from outside MADRE (a file the person dropped in, a catalog entry), so each one
    // is checked before anything is written: nothing climbs out, nothing is absolute, nothing hides.
    if (!path || path.startsWith('/') || path.startsWith('\\') || /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path) || path.split(/[\\/]/).some((part) => part.startsWith('.'))) {
      throw new Error(t('{file} is not a path a skill may carry.', { file: path || '—' }));
    }
    const text = one.text ?? one.content ?? '';
    const data = Buffer.isBuffer(text) ? text : Buffer.from(String(text), 'utf8');
    bytes += data.length;
    if (bytes > MAX_BYTES) throw new Error(t('A skill weighs at most {max} KB.', { max: Math.round(MAX_BYTES / 1024) }));
    safe.push({ path, data });
  }
  // Written beside it and moved into place at the end: a write that fails halfway must not leave
  // the person without the skill they had.
  const target = join(dir, skill.id);
  const fresh = `${target}.nuevo`;
  await rm(fresh, { recursive: true, force: true }).catch(() => {});
  try {
    for (const one of safe) {
      await mkdir(dirname(join(fresh, one.path)), { recursive: true });
      await writeFile(join(fresh, one.path), one.data);
    }
    if (source) await writeFile(join(fresh, 'origen.json'), `${JSON.stringify({ ...source, at: new Date().toISOString(), version: skill.version ?? null }, null, 2)}\n`);
    await rm(target, { recursive: true, force: true }).catch(() => {});
    await rename(fresh, target);
  } catch (error) {
    await rm(fresh, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return { ...(await readSkill(target, { origin: scope === 'project' ? 'project' : 'user' })), installed: true };
}

// Removing one is the person's, as removing a module is: the folder goes, and nothing a skill's
// scripts may have written elsewhere is touched.
export async function removeSkill({ id, stateRoot, projectRoot }) {
  if (!ID.test(String(id ?? ''))) throw new Error(t('No skill «{id}».', { id }));
  const folders = skillFolders({ stateRoot, projectRoot });
  const removed = [];
  for (const dir of [folders.project, folders.user]) {
    const target = join(dir, id);
    if (!(await lstat(target).catch(() => null))?.isDirectory()) continue;
    await rm(target, { recursive: true, force: true });
    removed.push(target);
  }
  if (!removed.length) throw new Error(t('No skill «{id}».', { id }));
  return { id, removed };
}
