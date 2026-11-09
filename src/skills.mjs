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
import { fileURLToPath } from 'node:url';
import { t } from './i18n.mjs';

export const SKILL_FILES = ['HABILIDAD.md', 'SKILL.md'];
// A file an agent wrote that means «install me as a skill»: <id>.habilidad.md, as a module's own is
// <id>.module.mjs (src/modules/index.mjs). The agent writes it in its draft folder and cannot
// install it: the person does, from the room.
export const isSkillFile = (path) => /\.habilidad\.md$/i.test(String(path ?? ''));
export const skillIdOf = (path) => String(path ?? '').split(/[\\/]/).pop().replace(/\.habilidad\.md$/i, '');
// Where the guide an agent writing a skill is pointed at lives in this installation.
export const skillGuide = () => fileURLToPath(new URL('../docs/HABILIDADES.md', import.meta.url));
export const ID = /^[a-z][a-z0-9-]{1,39}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
// The body is in every turn this skill enters, so it is the one thing with a tight cap: about two
// thousand tokens. A skill with more to say puts it in referencias/ and points at it.
export const MAX_BODY = 8000;
// `when` never travels in the prompt — only the body does — so its only cost is the matching, and a
// truncated trigger loses exactly the half that matters: the «and NOT when…» at the end. Measured
// against the skills on a real computer (H-7, 2026-11-08), where Claude's run to about 900.
export const MAX_WHEN = 1000;
export const MAX_NAME = 60;
// What a skill may weigh ON THIS DISK, which is a different question from what may travel through
// the Market (src/market-remote.mjs keeps its own, tighter bound: one signed download each). The
// real ones measured on 2026-11-08 reach 61 files and 1158 KB — Claude's xlsx, pptx and docx carry
// their own libraries — and refusing those on a number nobody had measured would have been a guess
// dressed as a rule.
export const MAX_FILES = 200;
export const MAX_BYTES = 4 * 1024 * 1024;
// And what may be SENT to the Market: there each file is a download of its own, signed and pinned.
export const MARKET_MAX_FILES = 40;
// What an agent could run, and therefore what only #4 could ever reach. Read from the name, and
// from the executable bit for anything else.
const RUNNABLE = /\.(?:sh|bash|zsh|py|rb|pl|mjs|cjs|js|ts)$/i;
// Read from the name alone, for a file that is not on this disk yet (the Market's, H-4). On disk the
// executable bit counts too (readSkillFiles).
export const runnable = (path) => RUNNABLE.test(String(path ?? ''));

// Whether a skill may carry a file at this path. The paths come from outside MADRE — a file the
// person dropped in, an entry of the Market's catalog — so they are checked before anything is
// written: nothing climbs out, nothing is absolute, nothing hides.
export const safePath = (path) => {
  const said = String(path ?? '');
  if (!said || said.length > 200 || said.startsWith('/') || said.startsWith('\\')) return false;
  if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(said)) return false;
  return said.split(/[\\/]/).every((part) => part && !part.startsWith('.'));
};

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
// Who made it: a name, or `{ name: "Ana Ruiz", github: "anaruiz" }`. The name is what the Market
// shows; the GitHub user is only how a pull request is signed, so it is read and never demanded.
export function author(value) {
  const said = unquote(value ?? '');
  if (!said) return null;
  if (!said.startsWith('{')) return { name: said.slice(0, MAX_NAME), github: null };
  const of = (key) => {
    const hit = said.match(new RegExp(`\\b${key}\\s*:\\s*(?:"([^"]*)"|'([^']*)'|([^,}]*))`));
    return unquote(hit?.[1] ?? hit?.[2] ?? hit?.[3] ?? '') || null;
  };
  const name = of('name') ?? of('nombre');
  return name ? { name: name.slice(0, MAX_NAME), github: of('github') } : null;
}

// Whichever language the room speaks, for a name that may be one word or two.
export const pick = (value, language = 'es') => (value && typeof value === 'object' ? value[language] ?? value.es ?? value.en ?? null : value ?? null);

// WHAT A SKILL DECLARES. English keys, as a module's contract has them, with the Spanish ones a
// person writing by hand will reach for, and the ones a skill of Claude's already carries:
// `description` is its `when`. MADRE's own words are in English and the room speaks the person's
// language (src/i18n.mjs), here as everywhere.
// The last four are only needed to PUBLISH one (src/skill-check.mjs, H-5): what the Market shows.
// A skill is one file, so they live in its own header — asking for a second file with the same
// facts in JSON is work for whoever sends it and one more place for the two to disagree.
const KEYS = {
  id: ['id'], name: ['name', 'nombre'], when: ['when', 'cuando', 'description'],
  version: ['version', 'versión'], minMadre: ['minMadre', 'minmadre'],
  credit: ['credit', 'credito', 'crédito'], license: ['license', 'licencia'],
  line: ['line', 'linea', 'línea'], summary: ['summary', 'resumen'], shelf: ['shelf', 'estante'],
  author: ['author', 'autor', 'autora'],
};
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
    // Only for the Market, and only when it is going there (H-5).
    line: words(field(fields, 'line'), 140),
    summary: words(field(fields, 'summary'), 1200),
    shelf: unquote(field(fields, 'shelf') ?? '') || null,
    author: author(field(fields, 'author')),
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
    if (!safePath(path)) throw new Error(t('{file} is not a path a skill may carry.', { file: path || '—' }));
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

// ---- WHICH SKILLS A TURN GETS (H-2). Two ways, and the person decides which per skill:
//
//   always   the person turned it on here, so it is in every turn of this project.
//   match    the default: it enters when what was asked looks like what its `when` describes.
//   off      it is kept, and it enters nothing.
//
// MATCHED BY WORDS, not by meaning. A word match is free, works with no internet and no model, is
// the same every time, and — this is what decided it — it can be SHOWN: the room can say «this
// entered because you said “cotización”», which a number from an embedder cannot. A meaning pass
// is worth having on top, and it waits for a cutoff measured against real use rather than guessed
// (the recall's cut was measured; this one would not be). `nearness` is where it will plug in.
//
// Every skill's own words count against one budget, so however many match, a turn pays about what
// one skill costs and never more. The person's own «always» are seated first: their word before
// MADRE's guess.

// Words that say nothing about which skill is wanted. The ones almost every `when` carries are in
// here on purpose: without them, «cuando el usuario pide algo» would match every message.
const STOP = new Set(`
a acerca al algo alguien algun alguna alguno ante antes aqui asi aun cada como con contra cual
cuando cuanto de del desde donde dos el ella ellas ellos en entre era eran eres es esa ese eso
esta estan este esto estos favor hace hacer hacia hasta hay las les lo los mas mientras muy nada
ni nos nuestra nuestro para pero pide piden pides poco por porque pues que quien quiere quieren
quieres saber se sea segun ser si sin sobre solo son su sus tal tambien tiene tienen todo todos
tras una uno unos usa usar usuario ver vez vos
about after all almost already also always and any anyone anything are ask asked asking asks
because been before being between both but can cannot does doing done down each else even every
everything first for from gets getting give given goes going has have having her him his how
however into its just like made make makes making many may more most much must need needs never
not now off once one only onto other our out over own same she should since some something such
than that the their them then there these they this those through thus too under until use used
user users uses using very wants want was were what when where which while who whom why will with
within without would you your
`.trim().split(/\s+/));
const NO_MARKS = /\p{M}/gu;
export const MIN_WORD = 4;
// How many skills one turn may carry, before the budget has anything to say. Three is already more
// than a person keeps in their head about one request.
export const MAX_PER_TURN = 3;

// The words of a sentence that could tell one skill from another: no accents, no punctuation, no
// words everybody uses. Short ones are dropped, with two exceptions that carry a whole request on
// their own: anything with a digit in it («1099», «#4») and a word written in capitals, which is
// how a person writes the acronym their work turns on — IVA, SAT, RFC, PDF, SEO, API.
export function keywords(text) {
  const out = new Set();
  for (const raw of String(text ?? '').split(/[^\p{L}\p{N}_-]+/u)) {
    if (!raw) continue;
    const word = raw.normalize('NFD').replace(NO_MARKS, '').toLowerCase();
    if (!word || STOP.has(word)) continue;
    if (word.length >= MIN_WORD || /\d/.test(word) || (word.length >= 3 && raw === raw.toUpperCase())) out.add(word);
  }
  return out;
}

// Only the words that are words, as a module's switch keeps only the booleans (module-scope.mjs).
export const roomsIn = (block = {}) => Object.fromEntries(Object.entries(block?.rooms ?? {}).filter(([id, said]) => /^[\w.:-]{1,200}$/.test(id) && SKILL_STATES.includes(said)));

// The block written when a skill's switch moves. From Home, with no project, it is the word for
// every project and each project follows it again; from a project, that project's own word, which
// wins. The whole block, because updateConfig merges one level down.
export function skillStateIn(block = {}, roomId = null, state) {
  if (!SKILL_STATES.includes(state)) throw new Error(t('A skill is off, matched or always on; nothing else.'));
  if (!roomId) return { ...block, state, rooms: {} };
  return { ...block, rooms: { ...roomsIn(block), [roomId]: state } };
}

// What the person said about this skill, in this project. The shape is the one a module's switch
// has (src/module-scope.mjs): a word for every project, and a project's own word that wins.
export const SKILL_STATES = ['off', 'match', 'always'];
export function skillState(config = {}, id = null, roomId = null) {
  const block = config?.skills?.[id] ?? {};
  const own = roomId ? block?.rooms?.[roomId] : null;
  return SKILL_STATES.includes(own) ? own : SKILL_STATES.includes(block?.state) ? block.state : 'match';
}

// The skills this turn carries, in the order they will be read, each with why it is here.
// `nearness(skill, text)` is the meaning pass when there is one: a number from 0 to 1, consulted
// only for a skill no word matched, and only above `near`.
export function chooseSkills({ skills = [], text = '', config = {}, roomId = null, budget = MAX_BODY, limit = MAX_PER_TURN, nearness = null, near = 1 } = {}) {
  const asked = keywords(text);
  const seats = [];
  for (const skill of skills) {
    const state = skillState(config, skill.id, roomId);
    if (state === 'off') continue;
    if (state === 'always') { seats.push({ skill, state, why: [], score: Infinity }); continue; }
    if (!skill.when) continue;                  // nothing to match on: only «always» ever seats it
    const why = [...keywords(pick(skill.when, 'es') ?? skill.when)].filter((word) => asked.has(word));
    const close = why.length ? 1 : typeof nearness === 'function' ? Number(nearness(skill, text)) || 0 : 0;
    if (!why.length && !(close >= near && near <= 1)) continue;
    seats.push({ skill, state, why, score: why.length || close });
  }
  seats.sort((a, b) => (b.score - a.score) || a.skill.id.localeCompare(b.skill.id));
  const chosen = [];
  let chars = 0;
  for (const seat of seats) {
    if (chosen.length >= limit) break;
    if (chars + seat.skill.body.length > budget && chosen.length) break;
    chars += seat.skill.body.length;
    chosen.push({ ...seat.skill, state: seat.state, why: seat.why });
  }
  return { chosen, left: seats.slice(chosen.length).map((seat) => seat.skill.id), chars };
}

// ---- THE SKILLS OF ONE TURN, WRITTEN FOR THE AGENT (H-2). Model-facing, so it is in English like
// the rest of a briefing (src/room/prompt.mjs) and never goes through the catalogue.
//
// A skill carries files MADRE does not hand over: its folder lives outside the project, and whether
// an agent may read there is its own CLI's answer, not MADRE's. So the files are named with their
// folder and the agent is told what to do when it cannot reach them, which is true for every agent
// instead of being a promise only some keep.
const english = (value) => (value && typeof value === 'object' ? value.en ?? value.es ?? null : value ?? null);
const attribute = (value) => String(value ?? '').replace(/[<>"&\n]/g, ' ').trim().slice(0, 240);

export function formatSkills(skills = [], { mode = 1 } = {}) {
  const lines = [];
  for (const skill of skills) {
    const why = skill.state === 'always' ? 'the human turned it on for this project' : skill.why?.length ? `the human said: ${skill.why.join(', ')}` : 'it matches what was asked';
    lines.push(`<skill name="${attribute(english(skill.name) ?? skill.id)}" why="${attribute(why)}">`);
    lines.push(skill.body.trim());
    const carried = (skill.files ?? []).filter((one) => !one.runs && !SKILL_FILES.includes(one.path)).map((one) => one.path);
    if (carried.length) lines.push(`It carries ${carried.join(', ')}, in ${skill.dir}: read one when its instructions point at it. If you cannot reach that folder, say so in one line rather than guessing, and the human will attach what you need.`);
    if (skill.scripts?.length) {
      lines.push(mode === 4
        ? `It carries ${skill.scripts.join(', ')}, in ${skill.dir}: you may run one this turn, and as with any command, say in one line what it does before you do.`
        : `It carries ${skill.scripts.join(', ')}, which nothing runs in this mode: #4 AIRLOCK is the only turn that could, so do not try and do not ask the human to run one for you unless its instructions depend on it.`);
    }
    lines.push('</skill>');
  }
  return lines.join('\n');
}

// ---- SHARING ONE, HAND TO HAND (2026-11-08, C-1). The Market is the curated road: the author of
// MADRE reads a skill, signs it, and every MADRE can get it and be told when it is taken back. This
// is the other road, the one things actually travel on: somebody sends a colleague the file that
// solved their afternoon.
//
// What is prepared is the skill as it is, without MADRE's own record of where it came from, in a
// folder of its own so the person can find it. A skill of ONE file is written as `<id>.habilidad.md`
// — the same name an agent writes and the room already recognises — so the other side only has to
// drag it in. One that carries more says so: those files travel together or not at all, and nothing
// here builds an archive, because MADRE has nothing that opens one.
//
// Decided by the author on 2026-11-08: SKILLS ONLY. A module hand to hand would be code running with
// the permissions of whoever installed it, with nobody having read it.
export const shareFolder = (stateRoot, id) => join(stateRoot, 'compartir', id);
export async function shareSkill({ stateRoot, projectRoot, id }) {
  const { loaded } = await loadSkills({ stateRoot, projectRoot });
  const skill = loaded.find((one) => one.id === id);
  if (!skill) throw new Error(t('No skill «{id}».', { id }));
  const folder = shareFolder(stateRoot, id);
  await rm(folder, { recursive: true, force: true }).catch(() => {});
  await mkdir(folder, { recursive: true });
  const carried = skill.files.filter((file) => file.path !== 'origen.json');
  const alone = carried.length === 1 && SKILL_FILES.includes(carried[0].path);
  const written = [];
  for (const file of carried) {
    // Alone, it travels under the name the other side knows; with company, under its own.
    const name = alone ? `${skill.id}.habilidad.md` : file.path;
    const to = join(folder, name);
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, await readFile(join(skill.dir, file.path)));
    written.push(name);
  }
  return {
    id: skill.id, folder, files: written, alone,
    // What the other side will not get, said here and not discovered there.
    scripts: skill.scripts,
    file: alone ? join(folder, written[0]) : null,
  };
}
