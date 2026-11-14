import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { CHANGES_MARK, takeChangeSummary, turnChanges } from '../src/room/changes.mjs';
import { promptParts } from '../src/room/prompt.mjs';
import { changeSentence, changedFiles, fileToSee, filesSummary } from '../public/changes.js';
import { setLanguage } from '../public/i18n.js';

// «What changed» (2026-11-11): under each reply that touched the project, one sentence in the
// person's words, See, Undo and the files folded under them.

test('what changed: the closing line leaves the reply and travels beside it', () => {
  const reply = 'Listo, ya quedó.\n\nArchivos: index.html\n\nMADRE-CHANGES: Cambié el color de tu página y agregué un botón para borrar tareas.';
  assert.deepEqual(takeChangeSummary(reply), { text: 'Listo, ya quedó.\n\nArchivos: index.html', summary: 'Cambié el color de tu página y agregué un botón para borrar tareas.' });
  // Dressed the way a model may dress it: bold, quoted, in backticks.
  assert.equal(takeChangeSummary('Hecho.\n**MADRE-CHANGES:** «**Agregué la página de gastos.**»').summary, 'Agregué la página de gastos.');
  assert.equal(takeChangeSummary('Hecho.\n`MADRE-CHANGES: Agregué la página de gastos.`').summary, 'Agregué la página de gastos.');
  // Before a closing block, as the briefing asks: the block stays where it was.
  const withBlock = takeChangeSummary('Hecho.\nMADRE-CHANGES: Agregué un botón.\n```pulse-run\nrevisar\n$ npm test\n```');
  assert.equal(withBlock.summary, 'Agregué un botón.');
  assert.equal(withBlock.text, 'Hecho.\n\n```pulse-run\nrevisar\n$ npm test\n```');
  // Said twice, the last one is the one meant; an empty line is no sentence at all.
  assert.equal(takeChangeSummary('MADRE-CHANGES: uno\nMADRE-CHANGES: dos').summary, 'dos');
  assert.deepEqual(takeChangeSummary('Hecho.\nMADRE-CHANGES:   '), { text: 'Hecho.', summary: null });
  // A reply without it is handed back untouched, and the word inside a sentence is not the line.
  assert.deepEqual(takeChangeSummary('Nada que ver aquí.'), { text: 'Nada que ver aquí.', summary: null });
  const inline = 'La línea MADRE-CHANGES: va al final, dice MADRE.';
  assert.deepEqual(takeChangeSummary(inline), { text: inline, summary: null });
  assert.equal(takeChangeSummary(undefined).text, '');
  // A sentence that runs on is cut, not carried whole into a card meant for one or two lines.
  assert.ok(takeChangeSummary(`MADRE-CHANGES: ${'a'.repeat(600)}`).summary.length <= 280);
});

test('what changed: the agent\'s sentence only stands when the files back it', () => {
  const control = { checkpointId: 'cp-1', files: [{ status: 'M', path: 'index.html' }], forbiddenReverted: [] };
  assert.deepEqual(turnChanges({ summary: 'Cambié el color.', control }), { checkpointId: 'cp-1', summary: 'Cambié el color.' });
  // Nothing changed: no card, whatever the agent said.
  assert.equal(turnChanges({ summary: 'Cambié el color.', control: { ...control, files: [] } }), null);
  assert.equal(turnChanges({ summary: 'Cambié el color.' }), null);
  // MADRE put something back: the sentence may tell of a change that is gone, so the files say it.
  assert.deepEqual(turnChanges({ summary: 'Cambié el color.', control: { ...control, forbiddenReverted: ['.env'] } }), { checkpointId: 'cp-1' });
  const create = { checkpointId: 'cp-2', files: [{ status: 'A', path: 'gastos.html' }], existingReverted: ['index.html'], forbiddenReverted: [] };
  assert.deepEqual(turnChanges({ summary: 'Creé gastos y cambié index.', created: [{ path: 'gastos.html', status: 'created' }], create }), { checkpointId: 'cp-2' });
  assert.deepEqual(turnChanges({ summary: 'Creé gastos.', created: [{ path: 'gastos.html', status: 'created' }], create: { ...create, existingReverted: [] } }), { checkpointId: 'cp-2', summary: 'Creé gastos.' });
  // A lease without a restore point still says what it created; it just has no way back to offer.
  assert.deepEqual(turnChanges({ summary: 'Creé gastos.', created: [{ path: 'out/gastos.html', status: 'created' }] }), { summary: 'Creé gastos.' });
});

test('what changed: from the files alone, the sentence says no more than the files', () => {
  setLanguage('es');
  try {
    assert.equal(filesSummary([{ status: 'A', path: 'gastos.html' }, { status: 'M', path: 'src/index.html' }]), 'Creé gastos.html y cambié index.html.');
    assert.equal(filesSummary([{ status: 'created', path: 'a.css' }, { status: 'created', path: 'b.js' }, { status: 'D', path: 'viejo.txt' }]), 'Creé a.css y b.js y borré viejo.txt.');
    assert.equal(filesSummary([{ status: 'M', path: 'a' }, { status: 'M', path: 'b' }, { status: 'M', path: 'c' }, { status: 'M', path: 'd' }]), 'Cambié 4 archivos.');
    assert.equal(filesSummary([{ status: 'A', path: 'x' }, { status: 'M', path: 'y' }, { status: 'D', path: 'z' }]), 'Creé x, cambié y y borré z.');
    assert.equal(filesSummary([]), '');
    // The agent's own words win; without them, the files speak.
    assert.equal(changeSentence({ summary: '  Agregué un botón para borrar tareas. ', files: [{ status: 'M', path: 'index.html' }] }), 'Agregué un botón para borrar tareas.');
    assert.equal(changeSentence({ summary: null, files: [{ status: 'M', path: 'index.html' }] }), 'Cambié index.html.');
    setLanguage('en');
    assert.equal(filesSummary([{ status: 'A', path: 'gastos.html' }, { status: 'M', path: 'index.html' }]), 'Created gastos.html and changed index.html.');
  } finally { setLanguage('es'); }
  // One row a path, and «See» opens the first file that is still there.
  assert.deepEqual(changedFiles([{ status: 'A', path: 'a.html' }, { status: 'M', path: 'a.html' }, { path: '' }]), [{ path: 'a.html', name: 'a.html', kind: 'changed' }]);
  assert.equal(fileToSee([{ status: 'D', path: 'old.html' }, { status: 'M', path: 'src/new.html' }]).path, 'src/new.html');
  assert.equal(fileToSee([{ status: 'D', path: 'old.html' }]), null);
});

test('what changed: only a turn that may write is asked for the line', () => {
  const base = { agent: { id: 'codex' }, text: 'cambia el color', requester: 'you', depth: 0, allowDelegation: false, context: { messages: [], omittedMessages: 0 }, others: [] };
  const reading = promptParts({ ...base, mode: 1 });
  assert.equal(reading.find((part) => part.id === 'changes'), undefined, 'a read-only turn is not asked about changes');
  const editing = promptParts({ ...base, mode: 3, lease: { outDir: '/p', relativeDir: '.', scopes: { write: true }, control: true } });
  const block = editing.find((part) => part.id === 'changes');
  assert.ok(block, 'an EDIT turn is asked for the line');
  assert.ok(block.text.includes(`"${CHANGES_MARK}: <what changed>"`));
  assert.match(block.text, /in the human's language/);
  assert.match(block.text, /Say only what you really did/);
  assert.match(block.text, /If you changed nothing, leave it out/);
  // After what the lease says, so it is the last thing about writing that the agent reads.
  assert.ok(editing.findIndex((part) => part.id === 'lease') < editing.findIndex((part) => part.id === 'changes'));
});

const git = async (root) => {
  const { execFile } = await import('node:child_process');
  await new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd: root }, (error) => (error ? reject(error) : resolve())));
};

test('what changed: an EDIT turn carries its sentence and its restore point; the reply does not show the line', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-changes-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-changes-log-'));
  try {
    await git(root);
    await writeFile(join(root, 'index.html'), '<h1>tareas</h1>\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    let turn = 0;
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'codex-readonly': async ({ prompt }) => {
        turn += 1;
        assert.ok(prompt.includes(CHANGES_MARK), 'the EDIT turn was asked for the line');
        if (turn === 1) {
          await writeFile(join(root, 'index.html'), '<h1 style="color:teal">tareas</h1>\n<button>Borrar</button>\n');
          return { text: 'Listo.\n\nMADRE-CHANGES: Cambié el color de tu página y agregué un botón para borrar tareas.', usage: null };
        }
        // A turn that changed nothing and said it did anyway: no card, and the line still goes.
        return { text: 'Lo revisé.\nMADRE-CHANGES: Cambié todo.', usage: null };
      },
    } });
    room.setScopes({ codex: { maxMode: 3 } });
    await room.send({ text: 'cambia el color y agrega un botón para borrar', target: 'codex', mode: 3 });
    await room.send({ text: 'revisa', target: 'codex', mode: 3 });
    const events = await store.readAll();
    const replies = events.filter((event) => event.type === 'message.created' && event.payload.sender === 'codex');
    assert.equal(replies.length, 2);
    const [first, second] = replies.map((event) => event.payload);
    assert.equal(first.text, 'Listo.');
    assert.equal(first.changes.summary, 'Cambié el color de tu página y agregué un botón para borrar tareas.');
    const changed = events.find((event) => event.type === 'control.changed' && event.payload.responseMessageId === first.messageId);
    assert.ok(changed, 'the EDIT card\'s event names the reply it belongs to');
    assert.equal(first.changes.checkpointId, changed.payload.checkpointId, 'Undo goes to the same restore point the EDIT card had');
    assert.equal(second.text, 'Lo revisé.');
    assert.equal(second.changes, undefined, 'a turn that changed nothing has no card');
    // And Undo puts the page back as it was.
    const undone = await room.undoControl(first.changes.checkpointId);
    assert.equal(undone.ok, true);
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), '<h1>tareas</h1>\n');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('what changed: a CREATE turn that tried to change what existed loses its sentence, not its card', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-changes-create-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-changes-create-log-'));
  try {
    await git(root);
    await writeFile(join(root, 'index.html'), 'antes\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'codex-readonly': async () => {
        await writeFile(join(root, 'gastos.html'), '<h1>gastos</h1>\n');
        await writeFile(join(root, 'index.html'), 'después\n');
        return { text: 'Hecho.\nMADRE-CHANGES: Creé la página de gastos y la enlacé desde el inicio.', usage: null };
      },
    } });
    await room.send({ text: 'crea una página de gastos', target: 'codex', mode: 2 });
    const events = await store.readAll();
    const reply = events.find((event) => event.type === 'message.created' && event.payload.sender === 'codex').payload;
    assert.equal(reply.text, 'Hecho.');
    assert.deepEqual(reply.artifacts.map((file) => file.path), ['gastos.html']);
    assert.ok(reply.changes.checkpointId, 'CREATE has its restore point too');
    assert.equal(reply.changes.summary, undefined, 'MADRE put index.html back, so the sentence that names it is not shown');
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), 'antes\n');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('what changed: the page draws one card inside the reply, in place of the EDIT card', async () => {
  const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const card = app.slice(app.indexOf('function changesCard('), app.indexOf('// An agent handing a decision back.'));
  // The same way back MADRE already had, and the id control.reverted looks for.
  assert.match(card, /fetch\(`\/api\/control\/\$\{checkpointId\}\/undo`, \{ method: 'POST' \}\)/);
  assert.match(card, /card\.id = `control-\$\{checkpointId\}`/);
  assert.match(card, /el\('button', 'undo', t\('Undo'\)\)/);
  // And it asks first: the first press says «Sure? Undo», only the second goes back.
  const press = card.slice(card.indexOf("undo.addEventListener('click'"));
  assert.ok(press.indexOf("t('Sure? Undo')") < press.indexOf('/undo`'), 'Undo goes back on the first press');
  assert.match(press, /if \(!sure\) \{[\s\S]*?return;\s*\}/);
  assert.match(press, /setTimeout\(\(\) => \{ sure = null; undo\.textContent = t\('Undo'\)/, 'the question does not stay up forever');
  // See opens the file the way the file list does; the files are folded.
  assert.match(card, /openViewer\(\{ root: 'project', path: first\.path/);
  assert.match(card, /el\('details', 'turn-changes-files'\)/);
  // One card a reply.
  assert.match(card, /bubble\.querySelector\(':scope > \.turn-changes'\)\) return false/);
  // EDIT: the card takes the old card's place when the reply is there; otherwise the old card stays.
  assert.match(app, /case 'control\.changed': [^\n]*node = attachControlChanges\(event\) \? null : renderControlChanged\(event\);/);
  // CREATE: the files come with the reply.
  assert.match(app, /const createdCard = event\.payload\.artifacts\?\.length \? changesCard\(/);
  // The module the card's sentence comes from is served to the page and to the phone.
  const [server, policy] = await Promise.all([
    readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8'),
    readFile(join(import.meta.dirname, '..', 'src', 'bridge', 'policy.mjs'), 'utf8'),
  ]);
  assert.ok(server.includes("'/changes.js'") && policy.includes("'/changes.js'"));
});

test('modules an answer needs: the line leaves the reply and only known modules are offered (2026-11-14)', async () => {
  const { takeModuleNeeds } = await import('../src/room/changes.mjs');
  const said = takeModuleNeeds('Para probar la página necesito el navegador de pruebas.\n\nMADRE-MODULE: playwright\n**MADRE-MODULE:** `ripley`\nMADRE-MODULE: rm-rf\nMADRE-MODULE: playwright');
  assert.equal(said.text, 'Para probar la página necesito el navegador de pruebas.');
  assert.deepEqual(said.needs, ['playwright', 'ripley'], 'an unknown id is dropped and a repeated one counted once');
  assert.deepEqual(takeModuleNeeds('Sin pedir nada.'), { text: 'Sin pedir nada.', needs: [] });
});
