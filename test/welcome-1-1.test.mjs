// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The welcome of 1.1 (2026-11-08, docs/private/BIENVENIDA-1.1.md): set up like a new phone. Six steps,
// a picture of what each is doing drawn with the brand's pulse, the folders other tools already know
// brought along, and a project opened with its first message already written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const pub = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('welcome 1.1 · six steps, the same on the page and on the server, and «what it is for» kept with them', async () => {
  const welcome = await pub('welcome.js');
  const { WELCOME_STEPS, WELCOME_PROFILES } = await import('../src/tour.mjs');
  assert.deepEqual(WELCOME_STEPS, ['hello', 'use', 'agents', 'project', 'ai', 'ready']);
  const said = welcome.match(/export const WELCOME_STEPS = (\[[^\]]+\]);/)[1].replace(/'/g, '"');
  assert.deepEqual(JSON.parse(said), WELCOME_STEPS);
  // Each use the page offers is one the server keeps, and each has its own first messages.
  const offered = [...welcome.matchAll(/\{ id: '(\w+)', short: /g)].map((match) => match[1]);
  assert.deepEqual(offered, WELCOME_PROFILES);
  for (const id of [...WELCOME_PROFILES, 'none']) assert.match(welcome, new RegExp(`\\n  ${id}: \\(\\) => \\[t\\(`), `no first messages for ${id}`);
  assert.match(welcome, /await save\(\{ profile: \[\.\.\.s\.profile\] \}\);/);
  // The machine step and the memory step are gone into the greeting and the local AI.
  assert.doesNotMatch(welcome, /function machine\(\)|function memoryStep\(\)/);
  assert.match(welcome, /content\.replaceChildren\(greeting, machineFacts\(\), \.\.\.placeNotes\(\)\);/);
});

test('welcome 1.1 · the stage is the brand book\'s: its ground, its phosphor, its pulse, still for whoever asked for less motion', async () => {
  const scene = await pub('welcome-scene.js');
  assert.match(scene, /const BG = '#050605';/);
  assert.match(scene, /const PHOSPHOR = \[155, 255, 102\];/);
  // The beat of the logo itself (madre-mark): flat, a high peak, a valley, a small peak.
  assert.match(scene, /const BEAT = \[\[0, 0\], \[3\.5, -1\], \[8, 1\], \[12, 0\], \[15, 0\], \[17, -0\.5\], \[19, 0\]\];/);
  assert.match(scene, /prefers-reduced-motion: reduce/);
  assert.match(scene, /const FADE = 0\.4;/);
  assert.doesNotMatch(scene, /rotate\(|shadowBlur/, 'no spinning and no neon');
  // Every picture the welcome asks for is drawn.
  const welcome = await pub('welcome.js');
  const asked = new Set([...welcome.matchAll(/\{ id: '(hello|use|agents|project|ai|ready)', data/g)].map((match) => match[1]));
  for (const id of asked) assert.match(scene, new RegExp(`\\n    ${id}\\(t, now, data\\) \\{`), `no picture for ${id}`);
  assert.equal(asked.size, 6);
  // The agents are shown by their owners' official marks (brands.js), never redrawn.
  assert.match(welcome, /mark: brandOf\(agent\.id\)\.mark\(\)/);
  assert.match(scene, /svg\.replace\(\/currentColor\/g, ink\)/);
  // Served like every module of the page.
  assert.match(await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8'), /'\/welcome\.js', '\/welcome-scene\.js'/);
  assert.match(await readFile(join(import.meta.dirname, '..', 'public', 'salas-mac.css'), 'utf8'), /\.wl-scene \{ position: relative; justify-self: stretch; width: 100%; height: 176px;/);
});

test('welcome 1.1 · the folders other tools know come along, read for their paths and nothing else', async () => {
  const { foldersFromTools, suggestProjects, toolFolderFits } = await import('../src/salas.mjs');
  const home = await mkdtemp(join(tmpdir(), 'madre-welcome-home-'));
  const state = join(home, '.pulse');
  try {
    const shop = join(home, 'Proyectos', 'tienda');
    const notes = join(home, 'notas');
    const worktree = join(home, 'Proyectos', 'tienda', '.claude', 'worktrees', 'x');
    for (const folder of [shop, notes, worktree, state]) await mkdir(folder, { recursive: true });
    // Claude Code, Gemini, Codex, Cursor: each in its own file and its own way.
    await writeFile(join(home, '.claude.json'), JSON.stringify({ oauthAccount: { secret: 'never read' }, projects: { [shop]: { history: ['never read'] }, [home]: {}, [worktree]: {}, '/etc': {} } }));
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', 'projects.json'), JSON.stringify({ projects: { [notes]: 'notas' } }));
    await mkdir(join(home, '.codex', 'sessions', '2026', '11', '08'), { recursive: true });
    await writeFile(join(home, '.codex', 'sessions', '2026', '11', '08', 'rollout-1.jsonl'), `${JSON.stringify({ type: 'session_meta', payload: { cwd: shop, instructions: 'x'.repeat(40000) } })}\n{"type":"message"}\n`);
    await mkdir(join(home, '.config', 'Cursor', 'User', 'globalStorage'), { recursive: true });
    await writeFile(join(home, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'), JSON.stringify({ profileAssociations: { workspaces: { [pathToFileURL(notes).href]: '__default__', 'vscode-remote://ssh/x': '__default__' } } }));
    const tools = await foldersFromTools({ home, platform: 'linux' });
    assert.deepEqual(tools.map((one) => `${one.from}:${one.path}`).sort(), [`claude:${shop}`, `claude:${home}`, `claude:${worktree}`, 'claude:/etc', `codex:${shop}`, `cursor:${notes}`, `gemini:${notes}`].sort());
    // Only folders inside the home, never the home, a hidden folder on the way, or a place that holds everything.
    assert.equal(toolFolderFits(shop, home), true);
    assert.equal(toolFolderFits(home, home), false);
    assert.equal(toolFolderFits(worktree, home), false);
    assert.equal(toolFolderFits('/etc', home), false);
    assert.equal(toolFolderFits(join(home, 'Documents'), home), false);
    const found = await suggestProjects({ home, stateRoot: state, platform: 'linux' });
    assert.deepEqual(found.map((one) => [one.name, one.from.sort()]).sort(), [['notas', ['cursor', 'gemini']], ['tienda', ['claude', 'codex']]]);
    assert.ok(found.every((one) => typeof one.when === 'string'));
    // Nothing else of those files ever leaves them.
    assert.doesNotMatch(JSON.stringify(found), /never read/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('welcome 1.1 · it ends inside a project with the first message written, never sent on its own', async () => {
  const welcome = await pub('welcome.js');
  const home = await pub('salas-mac.js');
  const app = await pub('app.js');
  assert.match(welcome, /void host\.openProject\?\.\(room, \{ draft: idea \}\)/);
  assert.match(home, /openProject: \(room, \{ draft = null \} = \{\}\) => startRoom\(room, \{ enter: true, draft \}\),/);
  assert.match(home, /#escribe=\$\{encodeURIComponent\(draft\)\}/);
  assert.match(app, /if \(\/\^#escribe=\/\.test\(globalThis\.location\?\.hash \?\? ''\)\) \{/);
  assert.match(app, /if \(words\.trim\(\)\) setTimeout\(\(\) => \{ els\.input\.value = words; els\.input\.focus\(\); autosize\(\); renderHighlight\(\); \}, motion\(500\)\);/);
  // The local AI, its memory and the hello with it: one press, then it downloads while the person goes on.
  assert.match(welcome, /s\.queue = hasModel\(EMBED_MODEL\) \|\| s\.pulls\.get\(EMBED_MODEL\)\?\.running \? \[\] : \[EMBED_MODEL\];/);
  assert.match(welcome, /if \(pull && event\.payload\.ok && s\.queue\.length\) void startPull\(s\.queue\.shift\(\)\);/);
  assert.match(welcome, /next: going \? t\('Continue while it downloads'\) : t\('Continue'\),/);
  // The Coordinator is explained where the AI it works with is, and the talk says where it ran.
  assert.match(welcome, /t\('Your Coordinator works with it'\)/);
  assert.match(welcome, /t\('Answered in \{s\} s · on your computer · no internet', \{ s: seconds \}\)/);
});
