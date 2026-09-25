import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('local model: running is not ready, and the room says which of the two it has', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);

  // The line that already announced @madre now carries whether it has been measured against THIS
  // project, because that is the line a person actually reads.
  assert.match(app, /case 'local\.present': \{/);
  assert.match(app, /Nobody has measured it against this project yet: running here is not the same as being of use here\./);
  // And one button, which runs the test that already exists.
  assert.match(app, /CHECK IT AGAINST THIS ROOM/);
  assert.match(app, /body: JSON\.stringify\(\{ which: 'match' \}\)/);
  assert.match(app, /it spends nothing, and the answer lands here/);

  // The answer lands in the room, with the one thing to do about it.
  assert.match(app, /case 'local\.checked': \{/);
  assert.match(app, /It is ready to be worked in\./);
  assert.match(app, /SEND THE NEXT TURN TO @MADRE/);
  // A test that cannot fail says nothing, so the failing sentence is written too.
  assert.match(app, /Not yet — keep working, the archive fills where the work happens\./);
  // And the sphere keeps the reading between visits.
  assert.match(app, /Measured against this room \$\{agoWords\(measured\.at\)\}/);
  assert.match(css, /\.system\.local-model \{/);
});

test('local model: the slow test tells the room, and only when it really ran', async () => {
  const room = await readFile(join(import.meta.dirname, '..', 'src', 'room.mjs'), 'utf8');
  // It takes minutes; its answer used to land in a panel the human had to go back to.
  assert.match(room, /if \(result\.ran\) \{\s*await this\.#emit\('local\.checked'/);
  assert.match(room, /passed: Boolean\(result\.passed\), matched: result\.matched \?\? 0, n: result\.n \?\? 0/);
  // A stopped or impossible run announces nothing: there is no reading to announce.
  const branch = room.slice(room.indexOf("if (which === 'match')"), room.indexOf("return { started: 'match' };"));
  assert.ok(branch.includes('if (result.ran)'), 'a test that did not run would still speak');

  const server = await readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8');
  // Said once per model, and said at all: the crew line fires only when the crew CHANGES, so a
  // room whose Ollama was already up when it opened would never have heard it.
  assert.match(server, /memory\.metaGet\('local\.announced'\) !== fifth\.version/);
  assert.match(server, /memory\.metaSet\('local\.announced', fifth\.version\);/);
  assert.match(server, /await room\.record\('local\.present', \{/);
});
