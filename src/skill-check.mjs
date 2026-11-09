// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE CHECK OF A SKILL SOMEBODY SENDS (2026-11-08, H-5). A skill sent to the Market — a pull request
// adding habilidades/<id>/ to the public `madre-mercado` repository, curated: the author of MADRE
// reads it, signs it and publishes it — is checked here first, the same way on the sender's
// computer, in the repository's CI (`madre check-skill`) and in scripts/market-publish.mjs before
// it is signed.
//
// WHAT IS DIFFERENT FROM A MODULE'S CHECK (src/market-check.mjs). A module is code, and the question
// is what that code reaches for. A skill is WORDS THAT REACH AN AGENT — one that may be holding
// CONTROL, or the airlock open — so the question is what those words ask the agent to do. The attack
// is injection, and it has a shape: tell the agent to hide something from the person, to ignore the
// briefing, to raise its own permission, to send something somewhere. None of that can be caught
// perfectly by reading text, and nothing here pretends to: what has no honest reading is refused,
// everything else is written out for the person who reads it next.
//
// The one thing a skill may carry that could ever RUN is a program in guiones/, and MADRE never runs
// one: an agent does, with the permission of its turn, so below #4 AIRLOCK every one of them is
// inert. Each is still read for what it reaches for, because #4 exists.

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { t } from './i18n.mjs';
import { MAX_BODY, MARKET_MAX_FILES, SKILL_FILES, pick, readSkill, runnable } from './skills.mjs';

// The shelves of the Market a skill may sit on (public/market.js, MARKET_SHELVES).
export const SKILL_SHELVES = ['no-terminal', 'create', 'organize', 'save', 'connect'];
// Licenses a skill's text may carry: open ones a person can read, share and reuse. The list a
// module's code may carry, plus the Creative Commons ones, because a skill is prose, not software.
export const SKILL_LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'Apache-2.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later', 'ISC'];
const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// WHAT THE WORDS ASK FOR. Refused: an instruction with no honest reading, whoever wrote it. Said:
// something a good skill may well contain, and a reviewer should still see.
//
// Each pattern is in Spanish and English because a skill is written in the language of whoever
// wrote it, and the room MADRE serves writes in both.
const REFUSED = [
  ['hide', 'it tells the agent to keep something from the person', /\b(?:no\s+(?:le\s+)?(?:digas|menciones|avises|informes|cuentes)|sin\s+(?:decirle|avisarle|que\s+(?:lo\s+)?sepa)|a\s+escondidas|en\s+secreto)\b|\b(?:do\s*n[o']?t\s+(?:tell|mention|inform|say)|without\s+(?:telling|informing|letting\s+\w+\s+know)|keep\s+(?:it\s+)?(?:secret|hidden)|silently|behind\s+(?:their|his|her)\s+back)\b/i],
  // `[^.]` and not `[^.\n]`: a line break between «ignora» and «las instrucciones» is one keystroke,
  // and it used to be enough to walk past this (seen while writing H-5). A full stop ends the clause.
  ['ignore', 'it tells the agent to ignore what MADRE told it', /\b(?:ignora|olvida|desobedece|salta(?:te)?|pasa\s+por\s+alto)\b[^.]{0,40}\b(?:instruccion|instrucciones|regla|reglas|aviso|indicaciones|anterior|anteriores|sistema|madre)\b|\b(?:ignore|disregard|forget|override|bypass)\b[^.]{0,40}\b(?:instruction|instructions|rule|rules|prompt|previous|above|system|briefing)\b/i],
  ['permission', 'it tells the agent to give itself permission it was not given', /\b(?:sin\s+(?:pedir\s+)?permiso|aunque\s+no\s+(?:te\s+)?(?:lo\s+)?(?:den|hayan\s+dado)|aun\s+en\s+modo|sin\s+esperar\s+(?:la\s+)?confirmaci)\b|\b(?:without\s+(?:asking\s+(?:for\s+)?)?permission|even\s+if\s+(?:you\s+)?(?:are\s+)?not\s+allowed|regardless\s+of\s+(?:the\s+)?mode|do\s+not\s+wait\s+for\s+(?:the\s+)?(?:human|confirmation))\b/i],
];
const SAID = [
  ['network', 'it names a place on the internet', /\bhttps?:\/\/[^\s)"'<>]+/i],
  ['secrets', 'it names a file or a folder where credentials live', /\.env\b|\bid_rsa\b|\bcredentials?\.(?:json|yml|yaml)\b|~\/\.ssh|\bkeychain\b|\bllavero\b|\bAPI[_ -]?KEY\b|\bSECRET[_ -]?KEY\b|\btoken\b/i],
  ['commands', 'it hands the agent a command to run', /^\s*\$\s+\S|\b(?:curl|wget|npm\s+(?:i|install|run)|pnpm|yarn|pip\s+install|brew\s+install|sudo|chmod|rm\s+-rf|git\s+push|docker\s+run)\b/im],
  ['airlock', 'it talks about the modes or the airlock', /#\s*[34]\b|\bairlock\b|\bmodo\s*[34]\b/i],
  ['madre', "it names MADRE's own folders", /\.pulse\b|\.madre\b/],
  ['identity', 'it tells the agent who to be instead of what to do', /\b(?:eres\s+un[ao]?|act[uú]a\s+como|comp[oó]rtate\s+como|haz\s+de\s+cuenta)\b|\b(?:you\s+are\s+an?\b|act\s+as\s+an?\b|pretend\s+(?:to\s+be|you)|roleplay)\b/i],
];
// Read without accents, so «ignóra» is «ignora» and a pattern does not have to carry every spelling
// somebody might reach for. Line breaks are left alone: some patterns are about the start of a line.
const plain = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '');
const scan = (list, text) => list.filter(([, , pattern]) => pattern.test(plain(text))).map(([id, words]) => ({ id, words: t(words) }));
export const refusedIn = (text) => scan(REFUSED, text);
export const saidIn = (text) => scan(SAID, text);

// WHAT A PROGRAM REACHES FOR, read from its text, whatever language it is written in. Not a parser:
// the words that mean «this leaves the computer» or «this changes something», for a person to read.
const PROGRAM = [
  ['network', 'talks to the network', /\b(?:curl|wget|fetch\s*\(|requests\.|urllib|httpx|http\.client|net\/http|socket|nc\s+-)/i],
  ['commands', 'runs other programs', /\b(?:subprocess|os\.system|os\.popen|child_process|execFile|spawn\s*\(|system\s*\(|`[^`]*`|\$\()/],
  ['files', 'reads or writes files', /\b(?:open\s*\(|readFile|writeFile|shutil|pathlib|os\.remove|unlink|rm\s+-|mv\s+|cp\s+|>>?\s*["'$\w./-])/],
  ['environment', 'reads environment variables', /\b(?:os\.environ|process\.env|getenv|\$\{?[A-Z_]{3,}\}?)\b/],
  ['install', 'installs something', /\b(?:pip\s+install|npm\s+(?:i|install)|apt(?:-get)?\s+install|brew\s+install|gem\s+install)\b/i],
  ['elevate', 'asks for the computer\'s permission', /\b(?:sudo|chmod\s+\+x|doas)\b/],
];
export const programReaches = (text) => PROGRAM.filter(([, , pattern]) => pattern.test(plain(text))).map(([id, words]) => ({ id, words: t(words) }));

// The programs of a folder MADRE could not read as a skill: walked here so a reviewer still sees
// them. Shallow and plain — readSkillFiles is the one that enforces the rules, and it already said
// no to this folder.
async function programsIn(dir) {
  const { readdir } = await import('node:fs/promises');
  const out = [];
  const walk = async (at, prefix = '') => {
    for (const entry of (await readdir(at, { withFileTypes: true }).catch(() => []))) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) { await walk(join(at, entry.name), `${prefix}${entry.name}/`); continue; }
      if (entry.isFile() && runnable(entry.name)) out.push(`${prefix}${entry.name}`);
    }
  };
  await walk(dir);
  return out.sort();
}

const words = (value, max) => {
  const said = pick(value, 'es') ?? pick(value, 'en');
  return typeof said === 'string' && said.trim() && said.length <= max;
};

// WHAT THE MARKET SHOWS, read from the skill's own header and from nowhere else. A skill is one
// file: asking for a second one with the same facts in JSON is work for the sender and one more
// place for the two to disagree. `name`, `line` and `summary` may be in one language or in both —
// a skill whose instructions are in Spanish should not have to invent an English summary to be
// published, and the Market shows whichever it has.
export function skillFaults(skill) {
  const wrong = [];
  const say = (field, said) => wrong.push({ field, words: said });
  if (!skill) return [];
  if (!SEMVER.test(skill.version ?? '')) say('version', t('version: like 1.0.0, in the header of HABILIDAD.md.'));
  if (!SEMVER.test(skill.minMadre ?? '')) say('minMadre', t('minMadre: the oldest MADRE it works with, like 1.1.2.'));
  if (!words(skill.name, 60)) say('name', t('name: what it is called, up to 60 characters. In one language, or in both: { es, en }.'));
  if (!words(skill.when, 400)) say('when', t('when: in which cases it is for, naming the words people actually say. Without it, nobody\'s MADRE will bring it into a turn on its own.'));
  if (!words(skill.line, 140)) say('line', t('line: what it does in one line, up to 140 characters.'));
  if (!words(skill.summary, 1200)) say('summary', t('summary: what it does and when to use it, up to 1200 characters.'));
  if (!SKILL_SHELVES.includes(skill.shelf)) say('shelf', t('shelf: one of {list}.', { list: SKILL_SHELVES.join(', ') }));
  // The name is what the Market shows; the GitHub user is only how a pull request is signed, so it
  // is read when it is there and never demanded.
  if (!words(skill.author?.name ?? skill.author, 60)) say('author', t('author: your name, the one the Market shows.'));
  if (skill.author?.github && !GITHUB.test(skill.author.github)) say('author', t('author: the GitHub user, if you give one, is just the user name.'));
  if (!SKILL_LICENSES.includes(skill.license)) say('license', t('license: the one your text carries, one of {list}.', { list: SKILL_LICENSES.join(', ') }));
  if (!skill.body?.trim()) say('body', t('Under the header go the instructions themselves.'));
  else if (skill.body.length > MAX_BODY) say('body', t('The instructions are too long ({has} characters, at most {max}). What does not fit goes in referencias/.', { has: skill.body.length, max: MAX_BODY }));
  // The Market's bound, not the disk's: there each file is a signed download of its own.
  if (skill.files?.length > MARKET_MAX_FILES) say('files', t('A skill sent to the Market carries at most {max} files.', { max: MARKET_MAX_FILES }));
  if (skill.unknown?.length) say('header', t('Fields MADRE does not know: {list}', { list: skill.unknown.join(', ') }));
  return wrong;
}

// EVERYTHING AT ONCE, from the folder a pull request adds: the skill as MADRE reads it, what its
// words ask for, and what each of its programs reaches for. Nothing is run.
//
// THE RAW TEXT IS SCANNED EVEN WHEN THE SKILL DOES NOT READ. Otherwise a wrong version number would
// be enough to hide the body from the reviewer: MADRE would stop at «version: like 1.0.0» and never
// say a word about the page that tells an agent to keep things from the person. What a skill asks
// for is read first, from the bytes, and the header's own faults come after.
export async function checkSkillFolder(dir) {
  let skill = null;
  const faults = [];
  let raw = '';
  for (const candidate of SKILL_FILES) {
    const text = await readFile(join(dir, candidate), 'utf8').catch(() => null);
    if (text !== null) { raw = text; break; }
  }
  if (!raw) faults.push({ field: 'skill', words: t('There is no HABILIDAD.md to read.') });
  try {
    if (raw) skill = await readSkill(dir);
  } catch (error) {
    faults.push({ field: 'skill', words: t('MADRE cannot read it as a skill: {error}', { error: error.message }) });
  }
  faults.push(...skillFaults(skill));
  const refused = refusedIn(raw);
  for (const one of refused) faults.push({ field: 'body', words: t('Refused: {what}. A skill advises inside the mode of the turn; it never asks an agent to go around the person.', { what: one.words }) });
  const said = saidIn(raw);
  // Each program by name, with what it reaches for: the first thing a reviewer looks at, and the
  // only part of a skill that could ever run.
  const programs = [];
  for (const path of skill?.scripts ?? (raw ? await programsIn(dir) : [])) {
    const text = await readFile(join(dir, path), 'utf8').catch(() => '');
    programs.push({ path, bytes: text.length, reaches: programReaches(text) });
  }
  const result = {
    ok: faults.length === 0,
    faults,
    problems: faults.map((one) => one.words),
    fields: [...new Set(faults.map((one) => one.field))],
    skill: skill ? { id: skill.id, name: skill.name, version: skill.version, when: skill.when, chars: skill.body.length, files: skill.files.length } : null,
    said, refused, programs,
  };
  return { ...result, markdown: skillMarkdown(result, skill) };
}

// The summary a reviewer reads in the pull request (the CI writes it to the job's summary). It says
// what the skill tells the agents, whole: it is a page, and reading it is the review.
export function skillMarkdown(result, skill = null) {
  const lines = [];
  const title = pick(skill?.name, 'es') ?? pick(skill?.name, 'en') ?? skill?.id ?? 'skill';
  lines.push(`## ${result.ok ? '✅' : '❌'} ${title} ${skill?.version ?? ''}`.trim());
  const author = pick(skill?.author?.name ?? skill?.author, 'es');
  if (author) lines.push(t('By **{name}**{github} · {license} · shelf `{shelf}`', { name: author, github: skill?.author?.github ? ` (@${skill.author.github})` : '', license: skill?.license ?? t('no license'), shelf: skill?.shelf ?? '—' }));
  if (result.problems.length) {
    lines.push('', `### ${t('To fix before it can be reviewed')}`);
    for (const one of result.problems) lines.push(`- ${one}`);
  }
  if (skill?.when) lines.push('', `### ${t('When it comes into a turn')}`, pick(skill.when, 'es') ?? pick(skill.when, 'en'));
  if (skill?.body) {
    lines.push('', `### ${t('What it tells the agents ({chars} characters)', { chars: skill.body.length })}`, '', '```markdown', skill.body.trim(), '```');
  }
  if (result.programs.length) {
    lines.push('', `### ${t('Programs it carries ({n})', { n: result.programs.length })}`);
    lines.push(t('MADRE never runs one: an agent does, and only in #4 AIRLOCK. Below it they do nothing.'));
    for (const one of result.programs) lines.push(`- \`${one.path}\` · ${one.reaches.length ? one.reaches.map((reach) => reach.words).join(', ') : t('nothing beyond reading itself')}`);
  }
  const carried = (skill?.files ?? []).filter((file) => !file.runs && !SKILL_FILES.includes(file.path)).map((file) => file.path);
  if (carried.length) lines.push('', `### ${t('It also carries')}`, carried.map((path) => `- \`${path}\``).join('\n'));
  if (result.said.length) {
    lines.push('', `### ${t('Worth a look')}`);
    for (const one of result.said) lines.push(`- ${one.words}`);
  }
  lines.push('', `_${t('Checked by MADRE (src/skill-check.mjs). A skill is words that reach an agent which may be holding CONTROL, so a person reads them before they are signed: no reading of text catches every instruction written to go around you.')}_`);
  return lines.join('\n');
}

// ---- SENDING ONE'S OWN (2026-11-08, H-8). A skill is one file, so sending it is not a form full of
// facts MADRE already knows: it is the two or three things only the person can say — which shelf,
// their name, which license — written into the skill's own header, beside what it already said.
// Ready, the folder is copied where they can find it, with the page GitHub offers for adding files
// without a terminal.
export const MARKET_REPO = 'jossuealcacao-exe/madre-mercado';
export const skillUploadUrl = (id) => `https://github.com/${MARKET_REPO}/upload/main/habilidades/${id}`;
export const submissionFolder = (stateRoot, id) => join(stateRoot, 'market', 'submissions', 'habilidades', id);

// What is still missing from its header, in the order a person fills it in. Only the fields nobody
// but them can answer: everything else the skill already says about itself.
export const ASKS = ['line', 'summary', 'shelf', 'author', 'license', 'minMadre'];
export function submissionDraft(skill, { madre = null } = {}) {
  const author = skill.author?.name ? skill.author : null;
  return {
    id: skill.id,
    version: skill.version ?? '1.0.0',
    line: skill.line ?? null,
    summary: skill.summary ?? null,
    shelf: SKILL_SHELVES.includes(skill.shelf) ? skill.shelf : null,
    author: author ? { name: author.name, github: author.github ?? null } : null,
    license: SKILL_LICENSES.includes(skill.license) ? skill.license : null,
    minMadre: skill.minMadre ?? madre ?? null,
    // What it carries, so the form can say plainly that programs are read before anything is signed.
    scripts: skill.scripts ?? [],
    files: (skill.files ?? []).length,
  };
}

// The header of the skill as it will be sent: what it said, with what the person answered written in.
// Only the fields of ASKS are ever touched — the instructions, the id and the version are theirs.
export function withEntry(text, entry = {}) {
  const match = String(text ?? '').match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);
  if (!match) throw new Error(t('A skill starts with its header between two «---» lines: id, name and when it is for.'));
  const lines = match[2].split(/\r?\n/);
  const said = (key, value) => {
    const at = lines.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line));
    if (value === null || value === undefined || value === '') { if (at >= 0) lines.splice(at, 1); return; }
    const written = `${key}: ${value}`;
    if (at >= 0) lines[at] = written; else lines.push(written);
  };
  const words = (value) => (value && typeof value === 'object'
    ? `{ ${['es', 'en'].filter((lang) => value[lang]).map((lang) => `${lang}: ${JSON.stringify(String(value[lang]))}`).join(', ')} }`
    : JSON.stringify(String(value ?? '')));
  if (entry.line !== undefined) said('line', entry.line ? words(entry.line) : null);
  if (entry.summary !== undefined) said('summary', entry.summary ? words(entry.summary) : null);
  if (entry.shelf !== undefined) said('shelf', entry.shelf || null);
  if (entry.license !== undefined) said('license', entry.license || null);
  if (entry.minMadre !== undefined) said('minMadre', entry.minMadre || null);
  if (entry.author !== undefined) {
    const name = entry.author?.name?.trim();
    said('author', name ? `{ name: ${JSON.stringify(name)}${entry.author.github ? `, github: ${JSON.stringify(String(entry.author.github).replace(/^@/, ''))}` : ''} }` : null);
  }
  return `${match[1]}${lines.join('\n')}${match[3]}${String(text).slice(match[0].length)}`;
}

// The folder a pull request adds, written where the person can find it: the skill as it will be
// sent, checked once more the way the repository will check it.
export async function writeSubmission({ stateRoot, dir, entry }) {
  const skill = await readSkill(dir);
  const folder = submissionFolder(stateRoot, skill.id);
  await rm(folder, { recursive: true, force: true }).catch(() => {});
  for (const file of skill.files) {
    const from = join(skill.dir, file.path);
    const to = join(folder, file.path);
    await mkdir(dirname(to), { recursive: true });
    if (SKILL_FILES.includes(file.path)) await writeFile(to, withEntry(await readFile(from, 'utf8'), entry));
    else await copyFile(from, to);
  }
  const checked = await checkSkillFolder(folder);
  return { folder, id: skill.id, files: skill.files.map((file) => file.path), upload: skillUploadUrl(skill.id), ...checked };
}
