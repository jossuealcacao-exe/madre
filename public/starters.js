// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE FIRST MESSAGES OF AN EMPTY CHAT (2026-11-10, asked by the author): three chips written for this
// project and this person, never the same three sentences for everyone. What is in the project's
// folder decides them — its spreadsheets, documents, presentations, a store or web page, pictures,
// code — and they name its own files. A folder with nothing in it yet is a project being born: then
// what the person said MADRE is for, in the welcome (src/tour.mjs, WELCOME_PROFILES), decides.
//
// Only names are read (the first level of the folder, from /api/tree), never what a file says. Words
// in English, as every word of the page; i18n.js says them in the room's language. A chip that ends
// in «: » is for the person to finish (app.js leaves the cursor at its end).

const ext = (name) => (String(name).match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
const SHEETS = new Set(['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'numbers', 'ods']);
const DOCS = new Set(['md', 'docx', 'doc', 'pdf', 'txt', 'pages', 'odt', 'rtf']);
const SLIDES = new Set(['pptx', 'ppt', 'key', 'odp']);
const IMAGES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'psd', 'ai', 'fig', 'sketch']);
const CODE_FILES = new Set(['package.json', 'pyproject.toml', 'requirements.txt', 'cargo.toml', 'go.mod', 'composer.json', 'gemfile', 'pom.xml', 'build.gradle', 'deno.json', 'pubspec.yaml', 'makefile']);
const CODE_EXT = new Set(['py', 'js', 'mjs', 'ts', 'tsx', 'jsx', 'php', 'rb', 'java', 'go', 'rs', 'swift', 'kt', 'c', 'cpp', 'cs', 'vue', 'svelte']);
const CODE_DIRS = new Set(['src', 'lib', 'app', 'node_modules', 'tests', 'test']);
// A store's theme (Shopify) or a site (WordPress, a folder of pages).
const WEB_DIRS = new Set(['layout', 'templates', 'sections', 'snippets', 'wp-content', 'public', 'site', 'www']);
// What every project has and says nothing of what it is about.
const PAPERWORK = /^(readme|leeme|license|licen[cs]e|licencia|changelog|cambios|contributing|code_of_conduct|security|agents|claude|gemini)(\.|$)/i;

// What the first level of the folder holds, by kind; each list keeps the files' names in order.
export function readFolder(entries = []) {
  const kinds = { sheets: [], docs: [], slides: [], images: [], web: [], code: [] };
  for (const entry of entries) {
    const name = String(entry?.name ?? '');
    if (!name || name.startsWith('.')) continue;
    const lower = name.toLowerCase();
    if (entry.kind === 'dir') {
      if (CODE_DIRS.has(lower)) kinds.code.push(name);
      if (WEB_DIRS.has(lower)) kinds.web.push(name);
      continue;
    }
    const type = ext(name);
    if (CODE_FILES.has(lower) || CODE_EXT.has(type)) kinds.code.push(name);
    else if (type === 'html' || type === 'htm' || type === 'liquid') kinds.web.push(name);
    else if (SHEETS.has(type)) kinds.sheets.push(name);
    else if (SLIDES.has(type)) kinds.slides.push(name);
    else if (IMAGES.has(type)) kinds.images.push(name);
    else if (DOCS.has(type) && !PAPERWORK.test(name)) kinds.docs.push(name);
  }
  return kinds;
}

// Each kind's chips, best first: [icon, words, values].
const GROUPS = {
  sheets: (file) => [
    ['bars', 'Read {file} and tell me the most important thing its numbers show.', { file }],
    ['trending', 'With {file}, put together a summary of the month: what goes up, what goes down and what you would do.', { file }],
  ],
  docs: (file) => [
    ['note', 'Sum up {file} in five points and tell me what is still to be decided.', { file }],
    ['pencil', 'Improve the writing of {file} without changing what it says.', { file }],
  ],
  slides: (file) => [
    ['card', 'Go through {file} and tell me which slide is not needed and what is missing.', { file }],
  ],
  web: (_, project) => [
    ['globe', 'Look at the main page of {project} and suggest three changes so it brings in more customers.', { project }],
    ['search', 'Check the texts of {project}: spelling mistakes, confusing sentences and anything that is not clear.', { project }],
  ],
  images: (_, project) => [
    ['image', 'Sort the pictures in {project} by subject and suggest clear names for them.', { project }],
  ],
  code: (_, project) => [
    ['code', 'Explain {project} to me as to someone who does not program: what it does and how it is used.', { project }],
    ['running', 'How do I open it on my computer? Give me the steps one by one.', {}],
    ['warning', 'Go through {project} and tell me what is most urgent to fix, and why.', { project }],
  ],
};
const ANY = (project) => [
  ['help', 'What is in {project}, and how can you help me with it?', { project }],
  ['list', 'Make a list of what is in {project}, folder by folder.', { project }],
];

// A folder with nothing in it: what the person uses MADRE for (the welcome's `profile`).
const BORN = {
  business: [['globe', 'I want a page for my business: ', {}], ['calendar', 'Make me a list of what to do this week to get my business going.', {}]],
  numbers: [['bars', 'Make me a sheet to keep my sales and expenses for the month.', {}]],
  notes: [['note', 'I want to put my ideas in order in a document: ', {}]],
  code: [['code', 'I want to start an app: ', {}], ['compose', 'Before writing anything, ask me what I want to build and propose a plan in steps.', {}]],
  curious: [['spark', 'What could you do for me in an empty folder? Give me three ideas.', {}]],
};
const BORN_ANY = [['compose', 'I want to start a project: ', {}], ['spark', 'What could you do for me in an empty folder? Give me three ideas.', {}], ['compose', 'Before writing anything, ask me what I want to build and propose a plan in steps.', {}]];

// Round and round the groups, the first chip of each, then the second…, until there are `count`.
function weave(groups, count) {
  const out = [];
  const seen = new Set();
  for (let round = 0; out.length < count && groups.some((group) => group.length > round); round += 1) {
    for (const group of groups) {
      const chip = group[round];
      if (!chip || seen.has(chip[1]) || out.length >= count) continue;
      seen.add(chip[1]);
      out.push(chip);
    }
  }
  return out;
}

// The chips: [{ icon, text, open }], `text` already in the room's language through `t`.
export function startersFor({ entries = [], profile = [], project = 'this project', t = (words, values = {}) => words.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`), count = 3 } = {}) {
  const kinds = readFolder(entries);
  const empty = !entries.some((entry) => !String(entry?.name ?? '').startsWith('.'));
  let chosen;
  if (empty) {
    const own = profile.filter((id) => BORN[id]).map((id) => BORN[id]);
    chosen = weave([...own, BORN_ANY], count);
  } else {
    // Code leads where there is code; the rest of what the folder holds follows, in this order.
    const order = kinds.code.length ? ['code', 'sheets', 'docs', 'slides', 'images'] : ['sheets', 'docs', 'slides', 'web', 'images'];
    const groups = order.filter((kind) => kinds[kind].length).map((kind) => GROUPS[kind](kinds[kind][0], project));
    chosen = weave([...groups, ANY(project)], count);
  }
  return chosen.map(([icon, words, values]) => {
    const text = t(words, values);
    return { icon, text, open: text.endsWith(': ') };
  });
}
