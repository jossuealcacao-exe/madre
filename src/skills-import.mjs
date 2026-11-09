// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// BRINGING IN THE SKILLS A PERSON ALREADY HAS (2026-11-08, H-7). MADRE keeps every agent's own
// skills out of a turn on purpose — Claude is run with no setting sources and without the Skill
// tool, Codex with --ephemeral, OpenCode with --pure — so what somebody already wrote never reached
// the room. That is the hole this closes: their skills are read where their CLI keeps them, and the
// person brings over the ones they want.
//
// WHERE THEY LIVE, on this computer:
//
//   ~/.claude/skills/<name>/SKILL.md              written by hand
//   ~/.claude/skills/synced/<bucket>/<name>/      synced from their Claude account
//   <project>/.claude/skills/<name>/              this project's own
//   ~/.codex/skills/<name>/SKILL.md               Codex's, written by hand
//
// A folder whose name starts with a dot is skipped, and that is not only hygiene: Codex keeps its
// OWN machinery in ~/.codex/skills/.system/ (skill-installer, skill-creator, review-agent). Those
// are the CLI's, not the person's, and they are about installing skills into Codex — meaningless
// inside MADRE.
//
// NOTHING IS BROUGHT ON ITS OWN. Each is read, measured against what MADRE can hold, and listed
// with what would happen to it; the person picks. A skill that does not fit says why, with the
// number, because «it did not work» is not something a person can do anything with.

import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { t } from './i18n.mjs';
import { ID, MAX_BODY, installSkill, loadSkills, pick, readSkill, readSkillFiles } from './skills.mjs';

// Each place, with who keeps it. `label` is the agent's own name, so the list says where a skill
// comes from in the words the person already knows.
export function skillSources({ home = homedir(), projectRoot = null } = {}) {
  const out = [
    { who: 'claude', label: 'Claude', dir: join(home, '.claude', 'skills'), buckets: join(home, '.claude', 'skills', 'synced') },
    { who: 'codex', label: 'Codex', dir: join(home, '.codex', 'skills') },
  ];
  if (projectRoot) out.push({ who: 'claude', label: 'Claude', dir: join(projectRoot, '.claude', 'skills'), project: true });
  return out;
}

const folders = async (dir) => (await readdir(dir, { withFileTypes: true }).catch(() => []))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
  .sort();

// EVERY SKILL THIS COMPUTER ALREADY HAS, read as MADRE would read it, with what would happen to it
// here. Reading installs nothing and changes nothing.
export async function findSkills({ home = homedir(), projectRoot = null, stateRoot = null } = {}) {
  const have = stateRoot ? (await loadSkills({ stateRoot, projectRoot: projectRoot ?? stateRoot }).catch(() => ({ loaded: [] }))).loaded : [];
  const found = [];
  const seen = new Set();
  for (const source of skillSources({ home, projectRoot })) {
    const places = [];
    for (const name of await folders(source.dir)) {
      if (source.buckets && join(source.dir, name) === source.buckets) continue;   // read below, one level deeper
      places.push({ name, dir: join(source.dir, name) });
    }
    // The synced ones sit one folder deeper, under the id of whoever they were synced for.
    if (source.buckets) {
      for (const bucket of await folders(source.buckets)) {
        for (const name of await folders(join(source.buckets, bucket))) places.push({ name, dir: join(source.buckets, bucket, name), synced: true });
      }
    }
    for (const place of places) {
      if (seen.has(place.dir)) continue;
      seen.add(place.dir);
      const one = { who: source.who, label: source.label, id: place.name, dir: place.dir, synced: Boolean(place.synced), project: Boolean(source.project) };
      try {
        const skill = await readSkill(place.dir);
        found.push({
          ...one, id: skill.id, fits: true,
          name: skill.name, when: skill.when, version: skill.version, license: skill.license,
          chars: skill.body.length, files: skill.files.length, scripts: skill.scripts,
          // Its name is its own: one already here is replaced, and the person is told before it is.
          replaces: have.find((kept) => kept.id === skill.id) ? true : false,
        });
      } catch (error) {
        // Why, with the number: what a person can act on. The commonest by far is a page written
        // for a CLI that puts no budget on it (measured on this computer: five of nine).
        found.push({ ...one, fits: false, why: error.message, ...(await measure(place.dir)) });
      }
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

// What is there, for one MADRE could not read: enough for the person to see how far off it is.
async function measure(dir) {
  const { files } = await readSkillFiles(dir, { maxFiles: Number.MAX_SAFE_INTEGER, maxBytes: Number.MAX_SAFE_INTEGER }).catch(() => ({ files: [] }));
  return { files: files.length, scripts: files.filter((file) => file.runs).map((file) => file.path) };
}

// BRINGING THEM OVER. Only the ones the person named, each copied whole into MADRE's own folder —
// its page, its references and its programs — with where it came from written beside it. A skill
// that cannot be read is never brought: it would be a folder nobody could switch on.
export async function importSkills({ ids = [], home = homedir(), stateRoot, projectRoot, scope = 'user' } = {}) {
  const wanted = new Set(ids.map((id) => String(id)));
  const available = await findSkills({ home, projectRoot, stateRoot });
  const brought = [];
  const left = [];
  for (const one of available) {
    if (!wanted.has(one.id)) continue;
    if (!one.fits) { left.push({ id: one.id, why: one.why }); continue; }
    try {
      if (!ID.test(one.id)) throw new Error(t('«{id}» is not a name MADRE can use for a skill: lowercase letters, numbers and dashes, 2 to 40, starting with a letter.', { id: one.id }));
      const { files } = await readSkillFiles(one.dir);
      const read = [];
      for (const file of files) read.push({ path: file.path, text: await readFile(join(one.dir, file.path)) });
      const done = await installSkill({ files: read, scope, stateRoot, projectRoot, source: { kind: 'import', from: one.dir, who: one.who, id: one.id } });
      brought.push({ id: done.id, name: pick(done.name, 'es') ?? done.id, who: one.who, files: done.files.length, scripts: done.scripts.length, chars: done.body.length });
    } catch (error) {
      left.push({ id: one.id, why: error.message });
    }
  }
  // Asked for something that is not here: said, never passed over in silence.
  for (const id of wanted) if (!available.some((one) => one.id === id)) left.push({ id, why: t('There is no skill called «{id}» on this computer.', { id }) });
  return { brought, left };
}

// One line for the person, for the room and for the terminal alike.
export const importSaid = ({ brought = [], left = [] } = {}) => (brought.length
  ? t('{n} brought in. {rest}', { n: brought.length, rest: left.length ? t('{m} could not come: read why beside each one.', { m: left.length }) : '' }).trim()
  : t('None could come. Each one says why.'));

// How far from fitting a page is, for the line that says so. MADRE never shortens somebody's
// instructions on its own: changing what an agent is told, without being asked, is not a favour.
export const overBy = (chars) => Math.max(0, Number(chars ?? 0) - MAX_BODY);
