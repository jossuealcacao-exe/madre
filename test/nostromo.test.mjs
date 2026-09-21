import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// NOSTROMO's ranking decides which memories the room's core speaks to, so it is worth holding
// to its promise. The functions are lifted out of the shipped client and run as they are: no
// copy of the formula lives here, and a change to app.js is a change to what these assert.
async function nostromoRanking() {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const take = (name) => {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} is gone from public/app.js`);
    let depth = 0;
    for (let i = source.indexOf('{', start); i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}' && (depth -= 1) === 0) return source.slice(start, i + 1);
    }
    throw new Error(`${name} does not close`);
  };
  return new Function(`${take('rawActivity')}\n${take('activityOf')}\nreturn { rawActivity, activityOf };`)();
}

const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

test('nostromo: the memories the room leans on are the ones the core speaks to', async () => {
  const { rawActivity, activityOf } = await nostromoRanking();
  const leaned = rawActivity({ recalled: 9, lastRecalled: daysAgo(0.1) }, 3);
  const onceLongAgo = rawActivity({ recalled: 1, lastRecalled: daysAgo(40) }, 3);
  const never = rawActivity({ recalled: 0, lastRecalled: null }, 3);
  assert.ok(leaned > onceLongAgo, 'a memory in constant use outranks one touched once, long ago');
  assert.ok(onceLongAgo > never, 'having been needed at all outranks never having been needed');

  // Recency counts on its own: same number of recalls, different last time.
  assert.ok(rawActivity({ recalled: 4, lastRecalled: daysAgo(0) }, 0) > rawActivity({ recalled: 4, lastRecalled: daysAgo(30) }, 0));
  // So does being woven in, when everything else is equal.
  assert.ok(rawActivity({ recalled: 2, lastRecalled: daysAgo(1) }, 6) > rawActivity({ recalled: 2, lastRecalled: daysAgo(1) }, 0));
});

test('nostromo: a young archive still breathes, and every memory keeps a pulse of its own', async () => {
  const { rawActivity, activityOf } = await nostromoRanking();

  // Nothing recalled yet: how woven a memory is has to carry the picture, or the network
  // opens dead on the first night of a room.
  const fresh = [6, 3, 1, 0].map((degree) => rawActivity({ recalled: 0, lastRecalled: null }, degree));
  const top = Math.max(...fresh);
  assert.ok(top > 0, 'an archive nobody has recalled from is not uniformly zero');
  const lit = fresh.map((raw) => activityOf(raw, top));
  assert.equal(lit[0], 1, 'the most woven memory is the brightest');
  assert.ok(lit[0] > lit[1] && lit[1] > lit[2] && lit[2] > lit[3], 'and the rest scale beneath it');
  assert.ok(lit.at(-1) >= 0.08, 'no memory falls silent completely');

  // An empty or flat archive must not divide by zero or produce NaN.
  for (const value of [activityOf(0, 0), activityOf(0.3, 0)]) {
    assert.ok(Number.isFinite(value) && value >= 0.08 && value <= 1, `activity stays in range, got ${value}`);
  }

  // Once turns start reaching for memories, use takes over from structure.
  const used = rawActivity({ recalled: 5, lastRecalled: daysAgo(0.2) }, 0);
  const merelyWoven = rawActivity({ recalled: 0, lastRecalled: null }, 8);
  assert.ok(activityOf(used, used) === 1 && activityOf(merelyWoven, used) < 0.4, 'a used memory outshines a merely well-connected one');
});

test('nostromo: activity is bounded, so no memory can burn out the view', async () => {
  const { rawActivity, activityOf } = await nostromoRanking();
  const absurd = rawActivity({ recalled: 100000, lastRecalled: new Date().toISOString() }, 500);
  assert.ok(absurd <= 1.0001, `the raw score stays bounded, got ${absurd}`);
  assert.equal(activityOf(absurd, absurd), 1);
  // A memory recalled in the future (a clock that jumped) must not go out of range either.
  const ahead = rawActivity({ recalled: 3, lastRecalled: daysAgo(-5) }, 2);
  assert.ok(Number.isFinite(ahead) && ahead <= 1.0001);
  assert.ok(activityOf(ahead, absurd) <= 1);
});
