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
  // Said plainly: what @madre is and what the trial does. Since 2026-11-10 it is offered only once
  // there is something to compare with, with «Try it» and «Remind me later».
  assert.match(app, /try it: it answers again up to 12 questions your agents already answered here, and MADRE compares the answers\./);
  assert.match(app, /if \(!payload\.offer\) return null;/);
  assert.match(app, /TRY IT ON THIS PROJECT/);
  assert.match(app, /t\('Remind me later'\)/);
  assert.match(app, /fetch\('\/api\/local\/later', \{ method: 'POST' \}\)/);
  assert.match(app, /body: JSON\.stringify\(\{ which: 'match' \}\)/);
  assert.match(app, /it spends nothing, and the answer lands here/);

  // The answer lands in the room, with the one thing to do about it.
  assert.match(app, /case 'local\.checked': \{/);
  assert.match(app, /You can give it work now\./);
  assert.match(app, /SEND THE NEXT TURN TO @MADRE/);
  // A test that cannot fail says nothing, so the failing sentence is written too.
  assert.match(app, /Not yet: keep working with your agents here and try it again later\./);
  // And the sphere keeps the reading between visits.
  assert.match(app, /t\('Measured against this project \{when\}: it landed where the agents landed on \{matched\} of \{n\} real questions\{verdict\}', \{ when: agoWords\(measured\.at\)/);
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
  // Offered when agents answered enough here to compare with, after a turn and when Ollama is
  // wired; put off or unanswered, again after a few days; never once the project was measured.
  assert.match(server, /if \(exams\.match\?\.ran\) return;/);
  assert.match(server, /if \(\(await target\.answeredByAgents\(\)\.catch\(\(\) => 0\)\) < LOCAL_TRY_MIN\) return;/);
  assert.match(server, /now - offered < LOCAL_TRY_AGAIN_MS/);
  assert.match(server, /await target\.record\('local\.present', \{/);
  assert.match(server, /if \(event\.type === 'agent\.completed' && event\.payload\?\.agent !== MADRE_AGENT_ID\) void offerLocalTry\(target\)/);
  assert.match(server, /url\.pathname === '\/api\/local\/later'/);
});

test('local model: MU/TH/UR can explain the difference between running and being of use', async () => {
  const { CONDITIONS, diagnose, fixesFor, PLATFORMS } = await import('../public/troubleshooting.js');
  const one = CONDITIONS.find((condition) => condition.id === 'local-ready');
  assert.ok(one, 'the catalogue cannot answer the question the room now raises');
  assert.match(one.diagnosis, /Running is not the same as being of use/);
  assert.match(one.remedy, /TRY IT ON THIS PROJECT/);
  // A person who asks it in their own words finds it.
  for (const asked of ['is my local model ready', 'ready to be worked in', 'not measured against this room']) {
    assert.ok(diagnose(asked).some((condition) => condition.id === 'local-ready'), `"${asked}" does not reach it`);
  }
  // And it answers on both systems this room is tested on, like everything else in there.
  for (const platform of Object.keys(PLATFORMS)) assert.ok(fixesFor(one, platform).length, `no answer for ${platform}`);
});
