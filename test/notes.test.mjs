import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import notes, { NOTE_COLORS, deleteNote, readNotes, saveNote } from '../src/modules/notes.mjs';

test('notes: a note is made, changed field by field, closed and thrown away', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-notes-'));
  assert.deepEqual(await readNotes(dir), []);
  const { note } = await saveNote(dir, { color: 'blue' });
  assert.equal(note.color, 'blue');
  assert.equal(note.open, true);
  // Only what a change names moves; a color that is not one of the six changes nothing.
  await saveNote(dir, { id: note.id, text: 'Llamar a Daniel' });
  await saveNote(dir, { id: note.id, color: 'chartreuse', box: { x: 40, y: 80, w: 300, h: 240 } });
  await saveNote(dir, { id: note.id, open: false });
  const [kept] = await readNotes(dir);
  assert.deepEqual([kept.text, kept.color, kept.open, kept.box], ['Llamar a Daniel', 'blue', false, { x: 40, y: 80, w: 300, h: 240 }]);
  assert.equal((await saveNote(dir, { id: 'not-a-note-here' })).error, 'unknown');
  assert.deepEqual(await deleteNote(dir, note.id), { deleted: note.id });
  assert.deepEqual(await readNotes(dir), []);
  assert.equal((await deleteNote(dir, note.id)).error, 'unknown');
});

test('notes: a file written by hand is read for what it says correctly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-notes-'));
  await writeFile(join(dir, 'notes.json'), JSON.stringify({ notes: [{ id: 'abc-123456', text: 'ok', color: 'teal', box: { x: 'left' } }, { id: '../../etc', text: 'no' }, 'junk'] }));
  const list = await readNotes(dir);
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].color, list[0].box, list[0].open], [NOTE_COLORS[0], null, true]);
});

test('notes: off by default, version 0.1, and its routes refuse while it is off in the project', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-notes-'));
  assert.equal(notes.version, '0.1.0');
  const route = notes.routes.find((one) => one.method === 'GET' && one.path === '/api/notes');
  const off = await route.handler({ config: {}, roomId: 'p1', roomDir: dir }, {});
  assert.equal(off.status, 412);
  const on = await route.handler({ config: { modules: { notes: { enabled: true } } }, roomId: 'p1', roomDir: dir }, {});
  assert.equal(on.status, 200);
  assert.deepEqual(on.body.notes, []);
});
