import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, stat, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectIndent, lineSpan, toggleComment, findAll } from '../public/editor.js';
import { writeEdited, MAX_EDIT_BYTES } from '../src/files.mjs';

test('editor: the indentation is the file\'s own, not the editor\'s preference', () => {
  assert.deepEqual(detectIndent('a\n  b\n    c\n  d'), { tabs: false, size: 2, unit: '  ' });
  assert.deepEqual(detectIndent('a\n    b\n        c'), { tabs: false, size: 4, unit: '    ' });
  assert.equal(detectIndent('a\n\tb\n\t\tc').tabs, true);
  // A file with no indentation at all gets the common default.
  assert.equal(detectIndent('a\nb').size, 2);
});

test('editor: a selection takes whole lines, and one ending at a line\'s start does not take that line', () => {
  const text = 'one\ntwo\nthree';
  assert.deepEqual(lineSpan(text, 5, 5), { from: 4, to: 7 });
  assert.deepEqual(lineSpan(text, 1, 6), { from: 0, to: 7 });
  // "one\n" selected whole: the caret sits at the start of "two", which is not part of it.
  assert.deepEqual(lineSpan(text, 0, 4), { from: 0, to: 3 });
  assert.deepEqual(lineSpan(text, 9, 9), { from: 8, to: 13 });
});

test('editor: a comment is the file\'s language\'s, and the same key takes it away', () => {
  const js = 'const a = 1;\n  const b = 2;';
  const commented = toggleComment(js, 'js');
  // At the block's smallest indentation, the way every editor does it: the marks line up.
  assert.equal(commented, '// const a = 1;\n//   const b = 2;');
  assert.equal(toggleComment(commented, 'js'), js);
  assert.equal(toggleComment('x = 1', 'py'), '# x = 1');
  assert.equal(toggleComment('# x = 1', 'py'), 'x = 1');
  assert.equal(toggleComment('a { color: red; }', 'css'), '/* a { color: red; } */');
  assert.equal(toggleComment('/* a { color: red; } */', 'css'), 'a { color: red; }');
  assert.equal(toggleComment('<b>x</b>', 'html'), '<!-- <b>x</b> -->');
  // JSON has no comments; the text is left alone rather than broken.
  assert.equal(toggleComment('{"a": 1}', 'json'), '{"a": 1}');
});

test('editor: find is plain by default, and case, whole words and patterns are asked for', () => {
  const text = 'Hola hola holanda';
  assert.equal(findAll(text, 'hola').length, 3);
  assert.equal(findAll(text, 'hola', { caseSensitive: true }).length, 2);
  assert.equal(findAll(text, 'hola', { word: true }).length, 2);
  assert.equal(findAll(text, 'h.la', { regex: true }).length, 3);
  // A pattern still being typed is not an error, only no matches.
  assert.deepEqual(findAll(text, '(unclosed', { regex: true }), []);
  assert.deepEqual(findAll(text, '.', {}), []);
});

test('editor: saving writes only an existing file inside the project, and never over a newer one', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-editor-'));
  const outside = await mkdtemp(join(tmpdir(), 'madre-outside-'));
  try {
    await writeFile(join(root, 'a.js'), 'old');
    const opened = (await stat(join(root, 'a.js'))).mtimeMs;

    const saved = await writeEdited(root, 'a.js', 'new', { mtimeMs: opened });
    assert.equal(saved.status, 200);
    assert.equal(await readFile(join(root, 'a.js'), 'utf8'), 'new');

    // Opened before the last save: the file on disk is newer than what the editor holds.
    const stale = await writeEdited(root, 'a.js', 'mine', { mtimeMs: opened - 5000 });
    assert.equal(stale.status, 409);
    assert.equal(stale.changed, true);
    assert.equal(await readFile(join(root, 'a.js'), 'utf8'), 'new', 'a stale editor overwrote the disk');
    // Asked, and answered yes.
    assert.equal((await writeEdited(root, 'a.js', 'mine', { mtimeMs: opened - 5000, force: true })).status, 200);

    // The editor makes no files and reaches nothing outside the project, links included.
    assert.equal((await writeEdited(root, 'missing.js', 'x')).status, 404);
    assert.equal((await writeEdited(root, '../escape.js', 'x')).status, 404);
    await writeFile(join(outside, 'secret.txt'), 'keep');
    await symlink(join(outside, 'secret.txt'), join(root, 'link.txt'));
    assert.equal((await writeEdited(root, 'link.txt', 'x')).status, 404);
    assert.equal(await readFile(join(outside, 'secret.txt'), 'utf8'), 'keep');

    assert.equal((await writeEdited(root, 'a.js', 'x'.repeat(MAX_EDIT_BYTES + 1))).status, 413);
    assert.equal((await writeEdited(root, 'a.js', null)).status, 400);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('editor: the textarea covers its whole page, starts at the top, and a Shift run keeps what ⌘ added', async () => {
  const [css, app, editor] = await Promise.all(['styles.css', 'app.js', 'editor.js'].map((name) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8')));
  // The page's global `textarea` rule is the composer's and caps it at 180px; under that line the
  // editor's drawing showed code that could not be clicked into.
  assert.match(css, /\.ed-input \{\n  position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; max-height: none;/);
  // Given its text, a textarea holds the caret after the last character; focusing jumped to the end.
  assert.match(editor, /input\.value = draft === null \|\| draft === undefined \? saved : [^\n]+;\n[\s\S]{0,200}input\.setSelectionRange\?\.\(0, 0\);/);
  // Finder's rule: Shift moves the run from the anchor, and what was added before it stays.
  assert.match(app, /for \(const one of kept\) viewerUI\.picked\.add\(one\);/);
});

test('editor: asking is the room\'s card, with the questions the lines themselves raise', async () => {
  const [editor, app] = await Promise.all(['editor.js', 'app.js'].map((name) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8')));
  // The editor hands over which lines, what they say and where the button stands; it draws no menu.
  assert.ok(!/ed-ask-menu|const ASKS = /.test(editor), 'the editor draws its own menu of fixed questions again');
  assert.match(editor, /onAsk\?\.\(\{ \.\.\.lines, text, anchor: anchor\.getBoundingClientRect\(\), dirty: isDirty\(\) \}\);/);
  assert.match(app, /onSave: saveEdited, onAsk: askAboutCode,/);
  // The questions come from the code's own shape, and the generic ones only fill what is left.
  const vm = await import('node:vm');
  const source = app.slice(app.indexOf('function codeSuggestions('), app.indexOf('// The questions a place on a page raises'));
  const codeSuggestions = vm.runInNewContext(`(${source.replace(/^function codeSuggestions/, 'function')})`, { t: (key, vars = {}) => key.replace(/\{(\w+)\}/g, (whole, name) => vars[name] ?? whole) });
  const asked = codeSuggestions('export async function load(url) {\n  try { return await fetch(url); } catch (error) { return null; }\n}', 'js', 'src/load.mjs');
  assert.ok(asked.includes('What does this catch swallow, and what should it let through?'));
  assert.ok(asked.includes('What happens here when the request fails or takes too long?'));
  assert.ok(asked.length <= 4);
  assert.ok(codeSuggestions('a { color: red }', 'css', 'x.css').includes('Why might this style not apply, and what overrides it?'));
  assert.equal(codeSuggestions('', 'js', '').length, 4, 'with nothing to read, the questions every piece of code can take');
  // From the memory only when the archive was opened with the designation this page.
  assert.match(app, /if \(about && nostromo\.armed\) \{/);
  // Writing one's own question is its own kind of button, with a pen.
  assert.match(app, /const own = el\('button', 'ask-own'\);\n  own\.type = 'button';\n  own\.innerHTML = ASK_OWN_ICON;/);
});

test('composer: what the room may do is said once, on one line, and no ? is left to repeat it', async () => {
  const [app, html, css] = await Promise.all(['app.js', 'index.html', 'styles.css'].map((name) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8')));
  assert.match(html, /<p id="safety" class="safety" hidden>/);
  assert.match(app, /const SAFETY_SEEN = 'madre\.safety\.seen';/);
  // The ? said the line again and cost the chips their room in a window.
  assert.ok(!/safetyHelp|safety-help/.test(app + css), 'the ? is back');
  assert.match(css, /\.picker \{ flex-wrap: wrap; row-gap: 10px; \}/);
});

test('a new file from the Finder: empty, inside the project, folders made, nothing overwritten, no way out', async () => {
  const { createEmptyFile } = await import('../src/files.mjs');
  const { mkdtemp, rm, readFile: read } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join: joinPath } = await import('node:path');
  const root = await mkdtemp(joinPath(tmpdir(), 'pulse-new-'));
  try {
    assert.deepEqual(await createEmptyFile(root, 'notes/today.md'), { status: 201, path: 'notes/today.md' });
    assert.equal(await read(joinPath(root, 'notes', 'today.md'), 'utf8'), '');
    assert.equal((await createEmptyFile(root, 'notes/today.md')).status, 409, 'an existing file was touched');
    for (const bad of ['../outside.md', 'a/../../outside.md', 'C:outside.md', '.git/config', 'folder/', '']) {
      assert.equal((await createEmptyFile(root, bad)).status, 400, `${bad} was accepted`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the Finder carries a key for a new file, and «review it with» stands in the top layer', async () => {
  const { readFile: read } = await import('node:fs/promises');
  const { join: joinPath } = await import('node:path');
  const [app, page, server] = await Promise.all(['public/app.js', 'public/index.html', 'src/server.mjs'].map((file) => read(joinPath(import.meta.dirname, '..', file), 'utf8')));
  assert.match(page, /<button id="tree-new" class="surface-gear tree-new"/);
  assert.match(app, /document\.querySelector\('#tree-new'\)\?\.addEventListener\('click'/);
  assert.match(server, /if \(request\.method === 'POST' && url\.pathname === '\/api\/files'\) \{[\s\S]{0,400}needsDesignationOnDisk\(canonicalProjectRoot, relative\)/);
  assert.match(app, /if \(!menuNode\.hasAttribute\('popover'\)\) \{ menuNode\.setAttribute\('popover', 'manual'\); document\.body\.append\(menuNode\); \}/);
});
