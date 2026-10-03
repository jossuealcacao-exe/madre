import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { parseChoice, withoutChoice, MIN_OPTIONS, MAX_OPTIONS } from '../src/choices.mjs';

const block = (body) => `Lo veo así.\n\n\`\`\`pulse-ask\n${body}\n\`\`\``;

test('choices: a question with three options or more becomes a choice, and nothing else does', () => {
  const asked = parseChoice(block('¿Dónde guardamos el dataset?\n- Junto al log de la sala\n- Dentro del proyecto\n- Donde el humano diga cada vez'));
  assert.equal(asked.question, '¿Dónde guardamos el dataset?');
  assert.deepEqual(asked.options, ['Junto al log de la sala', 'Dentro del proyecto', 'Donde el humano diga cada vez']);

  // Two options are a yes/no and a sentence already handles those.
  assert.equal(parseChoice(block('¿A o B?\n- A\n- B')), null);
  // Past six it is a list, not a choice.
  assert.equal(parseChoice(block(`¿Cuál?\n${Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => `- opción ${i}`).join('\n')}`)), null);
  assert.equal(parseChoice(block('- a\n- b\n- c')), null, 'a choice with no question was accepted');
  assert.equal(parseChoice('nada que ver'), null);
});

test('choices: a block that does not close the reply is an example, never a question', () => {
  // The same rule the delegation channel keeps: what follows a block proves it was being shown,
  // not asked. Without it, an agent explaining how to ask would ask.
  assert.equal(parseChoice(`${block('¿X?\n- a\n- b\n- c')}\n\nY además una cosa más.`), null);
});

test('choices: the same option twice is dropped, because a choice that repeats itself reads as rigged', () => {
  const asked = parseChoice(block('¿Cuál?\n- Reordenar\n- reordenar\n- Enrutar\n- Recortar'));
  assert.deepEqual(asked.options, ['Reordenar', 'Enrutar', 'Recortar']);
  assert.ok(asked.options.length >= MIN_OPTIONS);
});

test('choices: an option is kept whole, and the agent\'s own pick is read, not invented', () => {
  // The reported option, cut at 120 in the middle of "verdadera": the missing half was the option.
  const long = 'Registrar ambas violaciones (v1=r3, v2=r1) sobre el mismo fragmento f004 y acreditar Detección con al menos una verdadera';
  const asked = parseChoice(block(`¿Cómo se resuelve?\n- ${long} (recomendada)\n- Reformular r1\n- Dejarlo abierto`));
  assert.equal(asked.options[0], long);
  assert.equal(asked.recommended, 0);

  // Either language, either bracket, or a star in front; the mark never reaches the composer.
  assert.equal(parseChoice(block('¿X?\n- a\n- b [Recommended]\n- c')).recommended, 1);
  const starred = parseChoice(block('¿X?\n- a\n- b\n- ★ c'));
  assert.equal(starred.recommended, 2);
  assert.equal(starred.options[2], 'c');
  // Two marks: the first one counts. None: the choice still reaches the human.
  assert.equal(parseChoice(block('¿X?\n- a (recommended)\n- b (recommended)\n- c')).recommended, 0);
  assert.equal(parseChoice(block('¿X?\n- a\n- b\n- c')).recommended, null);

  // A paragraph is cut at a word, never mid-letter.
  const essay = parseChoice(block(`¿X?\n- ${'palabra '.repeat(80)}\n- b\n- c`)).options[0];
  assert.ok(essay.endsWith('palabra…'), essay.slice(-20));
});

test('choices: the room shows the question as bubbles, so the fence leaves the text', () => {
  const reply = block('¿Qué hacemos?\n- a\n- b\n- c');
  assert.equal(withoutChoice(reply), 'Lo veo así.');
  // And a reply that is not asking anything is handed back untouched, byte for byte.
  assert.equal(withoutChoice('Una respuesta normal.'), 'Una respuesta normal.');
});

test('decisions: a refuted decision never appears in what the project is standing on', async () => {
  const { settledDecisions } = await import('../src/room.mjs');
  const notes = [
    { id: 5, kind: 'decision', text: 'Vigente', created: 5, agent: 'codex', fromSequence: 1, refutedBy: null },
    { id: 4, kind: 'decision', text: 'Refutada', created: 4, agent: 'claude', fromSequence: 2, refutedBy: 9 },
    { id: 3, kind: 'decision', text: 'También vigente', created: 3, agent: 'gemini', fromSequence: 3, refutedBy: null },
  ];
  assert.deepEqual(settledDecisions(notes, { limit: 3 }).map((note) => note.text), ['Vigente', 'También vigente']);
  // Newest first, and never more than asked for.
  assert.equal(settledDecisions(notes, { limit: 1 })[0].text, 'Vigente');
  assert.deepEqual(settledDecisions([], { limit: 3 }), []);
  // Only what the strip shows travels: the archive's own columns stay in the archive.
  assert.deepEqual(Object.keys(settledDecisions(notes)[0]).sort(), ['agent', 'created', 'fromSequence', 'id', 'text']);
});

test('questions: only what the archive recorded as open, and never what was refuted or dismissed', async () => {
  const { openQuestions } = await import('../src/room.mjs');
  const notes = [
    { id: 9, kind: 'question', text: 'Arrastrada tres veces', recalled: 3, refutedBy: null },
    { id: 8, kind: 'question', text: 'Nunca retomada', recalled: 0, refutedBy: null },
    { id: 7, kind: 'question', text: 'Refutada', recalled: 5, refutedBy: 20 },
    { id: 6, kind: 'question', text: 'Descartada por el humano', recalled: 9, refutedBy: null },
    { id: 5, kind: 'decision', text: 'Una decisión, no una pregunta', recalled: 9, refutedBy: null },
  ];
  const asked = openQuestions(notes, { dismissed: ['open:6'], limit: 3 });
  // Carried into more turns ranks first: a question the room keeps dragging along unanswered is
  // the one most worth putting back on the table.
  assert.deepEqual(asked.map((one) => one.text), ['Arrastrada tres veces', 'Nunca retomada']);
  assert.equal(asked[0].carried, 3);
  assert.deepEqual(openQuestions([], {}), []);
});

test('modes: the ladder is offered only when an agent says it needs a rung it was not given', async () => {
  const { modeAsked } = await import('../public/routing.js');

  // The sentence from the session this came from: the human granted #2 twice while the reply
  // kept saying the fix was editing a file that already exists.
  assert.equal(modeAsked('Mode no alcanza: el arreglo es editar public/app.js, un archivo que ya existe, y eso es #3', { ran: 2 }), 3);
  assert.equal(modeAsked('Necesito #3 para modificar ese archivo.', { ran: 1 }), 3);
  assert.equal(modeAsked('Requiere #4 porque hay que hacer git push.', { ran: 1 }), 4);
  assert.equal(modeAsked('This needs #3 to edit an existing file.', { ran: 1 }), 3);

  // An agent explaining the ladder mentions every rung, and that is not a request. A bare number
  // is never enough: a word of need has to sit beside it.
  assert.equal(modeAsked('Los modos van de #0 a #4: #1 lee, #2 crea, #3 edita y #4 abre la esclusa.', { ran: 1 }), null);
  assert.equal(modeAsked('Listo, lo dejé en #2 como pediste.', { ran: 1 }), null);
  // And never a rung at or below the one the turn already had.
  assert.equal(modeAsked('Necesito #3 para esto.', { ran: 3 }), null);
  assert.equal(modeAsked('', { ran: 1 }), null);
});

test('ports: only loopback, only HTTP, and never the room itself', async () => {
  const { parseListening } = await import('../src/ports.mjs');
  const table = [
    'COMMAND     PID       USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME',
    'node      12066 eljochuaxd   21u  IPv4 0xaaaa                0t0  TCP 127.0.0.1:4317 (LISTEN)',
    'node       3778 eljochuaxd   21u  IPv4 0xbbbb                0t0  TCP 127.0.0.1:3000 (LISTEN)',
    'vite      4001 eljochuaxd   22u  IPv6 0xcccc                0t0  TCP [::1]:5173 (LISTEN)',
    // Reachable from the network: the room does not help anyone frame that by accident.
    'nginx      900 eljochuaxd   23u  IPv4 0xdddd                0t0  TCP *:8080 (LISTEN)',
    'rapportd   669 eljochuaxd   11u  IPv4 0xeeee                0t0  TCP 127.0.0.1:57744 (LISTEN)',
    'sshd       100 eljochuaxd   24u  IPv4 0xffff                0t0  TCP 127.0.0.1:22 (LISTEN)',
    'Code\\x20Helper 94252 eljochuaxd 25u IPv4 0x1111             0t0  TCP 127.0.0.1:5592 (LISTEN)',
  ].join('\n');

  const found = parseListening(table, { self: 4317 });
  assert.deepEqual(found.map((one) => one.port), [3000, 5173, 5592], 'the list is not loopback-only, or the room listed itself');
  // lsof escapes anything unprintable; a name with a space is still a name.
  assert.equal(found.find((one) => one.port === 5592).command, 'Code Helper');
  assert.equal(parseListening('', {}).length, 0);
});

test('finder: the project is the world, and the zones the room guards ask for its name first', async () => {
  const { planFileOp, needsDesignation } = await import('../src/file-ops.mjs');

  // Ordinary files move without ceremony: this is the human in their own project.
  const plain = planFileOp({ operation: 'copy', from: 'README.md', to: 'docs/README.md' });
  assert.equal(plain.ok, true);
  assert.equal(plain.guarded, false);

  // Either end being guarded is enough. Moving something harmless ONTO a protected path is how a
  // protected path gets overwritten, so the destination counts as much as the source.
  assert.equal(planFileOp({ operation: 'move', from: '.env', to: 'docs/env.txt' }).guarded, true);
  assert.equal(planFileOp({ operation: 'copy', from: 'docs/a.md', to: '.pulse/a.md' }).guarded, true);
  assert.equal(planFileOp({ operation: 'copy', from: 'a.md', to: '.claude/settings.local.json' }).guarded, true);
  assert.ok(needsDesignation('.git/config'));

  // A folder moved inside itself leaves nothing behind and no way back.
  assert.equal(planFileOp({ operation: 'move', from: 'src', to: 'src/inner' }).ok, false);
  assert.equal(planFileOp({ operation: 'copy', from: 'a.md', to: 'a.md' }).ok, false);
  assert.equal(planFileOp({ operation: 'delete', from: 'a', to: 'b' }).ok, false, 'an operation nobody defined was accepted');
  assert.equal(planFileOp({ operation: 'copy', from: '', to: 'b' }).ok, false);

  // Making something has a destination and no source, and the guard still applies to where it
  // would land — a new file inside .pulse is as much a slip as a key moved out of one.
  const made = planFileOp({ operation: 'new-folder', to: 'docs/drafts' });
  assert.equal(made.ok, true);
  assert.equal(made.from, null);
  assert.equal(made.guarded, false);
  assert.equal(planFileOp({ operation: 'new-file', to: '.pulse/notes.md' }).guarded, true);
  assert.equal(planFileOp({ operation: 'new-file', to: '' }).ok, false);
  assert.equal(planFileOp({ operation: 'new-file', to: 'docs/..' }).ok, false, 'a name that walks upwards was accepted');
});

test('finder: a copy pasted onto a taken name gets a name of its own instead of a refusal', async () => {
  const { freeCopyPath } = await import('../src/file-ops.mjs');
  const disk = new Set(['README.md', 'docs/plan.md', 'docs/plan copia.md', '.env', 'src']);
  const taken = async (path) => disk.has(path);

  // Free names are left alone: most pastes land somewhere empty.
  assert.equal(await freeCopyPath('docs/README.md', { taken, word: 'copia' }), 'docs/README.md');
  // Beside itself, the reported case: it used to answer "the source and the destination are the same path".
  assert.equal(await freeCopyPath('README.md', { taken, word: 'copia' }), 'README copia.md');
  // The second copy counts up instead of overwriting the first.
  assert.equal(await freeCopyPath('docs/plan.md', { taken, word: 'copia' }), 'docs/plan copia 2.md');
  // A leading dot is the name, not an extension; a folder has no extension to keep.
  assert.equal(await freeCopyPath('.env', { taken, word: 'copy' }), '.env copy');
  assert.equal(await freeCopyPath('src', { taken, word: 'copy' }), 'src copy');
});

test('abduction: the room answers to its name only when that is the whole of what was said', async () => {
  const { calledByName } = await import('../public/abduction.js');

  // Every registered frame ships with the room rather than being fetched when the joke runs.
  for (const asset of ['abduction-cat.png', 'abduction-cat-blink.png', 'abduction-cat-control-left.png', 'abduction-cat-control-right.png']) {
    await access(new URL(`../public/assets/${asset}`, import.meta.url));
  }

  // Called by name: the word alone, any casing, space around it.
  assert.equal(calledByName('MADRE'), true);
  assert.equal(calledByName('  madre  '), true);
  assert.equal(calledByName('Madre'), true);

  // @madre is the local agent being addressed and has a turn to answer: it is not this.
  assert.equal(calledByName('@madre'), false);
  assert.equal(calledByName('madre, revisa esto'), false);
  assert.equal(calledByName('la madre'), false);
  assert.equal(calledByName('madres'), false);
  assert.equal(calledByName(''), false);

  // Something attached means there is a message, and a message goes to an agent.
  assert.equal(calledByName('madre', { attachments: 1 }), false);
});

test('ports: what listens on every interface is counted, not discarded in silence', async () => {
  const { classifyListening, parseListening } = await import('../src/ports.mjs');
  // The two shapes `node` and `python -m http.server` produce by default, which is the common
  // case in the world: bound to every interface, and until now dropped without a word — so a
  // computer with three servers running reported as a computer with nothing on it.
  const table = [
    'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME',
    'node 111 me 20u IPv4 0x1 0t0 TCP 127.0.0.1:4317 (LISTEN)',
    'node 222 me 21u IPv6 0x2 0t0 TCP *:5173 (LISTEN)',
    'Python 333 me 3u IPv4 0x3 0t0 TCP 0.0.0.0:8000 (LISTEN)',
    'vite 444 me 7u IPv4 0x4 0t0 TCP 127.0.0.1:5174 (LISTEN)',
    'vite 444 me 8u IPv6 0x5 0t0 TCP [::]:5174 (LISTEN)',
  ].join('\n');

  const read = classifyListening(table, {});
  assert.deepEqual(read.ports.map((one) => one.port), [4317, 5174], 'only loopback may be offered');
  assert.deepEqual(read.wider.map((one) => one.port), [5173, 8000], 'what listens wide was not reported');
  // 5174 answers on loopback as well, so it is already openable and saying it twice would be noise.
  assert.equal(read.wider.some((one) => one.port === 5174), false);

  // The old door still answers the old way, because almost every caller only wants what it may open.
  assert.deepEqual(parseListening(table, {}), read.ports);
  assert.deepEqual(classifyListening('', {}), { ports: [], wider: [] });

  // A port of this room's own is never offered back to it.
  assert.equal(classifyListening(table, { self: 4317 }).ports.some((one) => one.port === 4317), false);
});
