import test from 'node:test';
import assert from 'node:assert/strict';
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
