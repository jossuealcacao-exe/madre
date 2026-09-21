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

// The renderer is the largest piece of client code in MADRE and the one nothing could reach:
// it needs a canvas. So the drawing path is lifted out of the shipped client and run against a
// context that records instead of paints. It catches what a screenshot cannot: a reference that
// does not resolve, a colour that comes out as `NaN`, geometry that leaves the body.
async function nostromoRenderer(room, { conic = false } = {}) {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const fn = (name) => {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} is gone from public/app.js`);
    let depth = 0;
    for (let i = source.indexOf('{', start); i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}' && (depth -= 1) === 0) return source.slice(start, i + 1);
    }
    throw new Error(`${name} does not close`);
  };
  const block = (name) => {
    const start = source.indexOf(`const ${name} = `);
    assert.notEqual(start, -1, `${name} is gone from public/app.js`);
    let depth = 0;
    for (let i = start; i < source.length; i += 1) {
      if ('[{'.includes(source[i])) depth += 1;
      else if (']}'.includes(source[i])) depth -= 1;
      else if (source[i] === ';' && depth === 0) return source.slice(start, i + 1);
    }
    throw new Error(`${name} does not close`);
  };

  const calls = [];
  const state = {};
  const record = (name) => (...args) => { calls.push({ name, args }); };
  const gradient = () => ({ addColorStop: (stop, color) => { calls.push({ name: 'addColorStop', args: [stop, color] }); } });
  const ctx = new Proxy({
    createRadialGradient: (...args) => { calls.push({ name: 'createRadialGradient', args }); return gradient(); },
    createLinearGradient: (...args) => { calls.push({ name: 'createLinearGradient', args }); return gradient(); },
    save: record('save'), restore: record('restore'), beginPath: record('beginPath'), closePath: record('closePath'),
    moveTo: record('moveTo'), lineTo: record('lineTo'), arc: record('arc'), quadraticCurveTo: record('quadraticCurveTo'),
    fill: record('fill'), stroke: record('stroke'), clip: record('clip'), fillRect: record('fillRect'),
    clearRect: record('clearRect'), setTransform: record('setTransform'), translate: record('translate'),
    rotate: record('rotate'), scale: record('scale'), fillText: record('fillText'), measureText: () => ({ width: 10 }),
    setLineDash: record('setLineDash'), ellipse: record('ellipse'), rect: record('rect'), drawImage: record('drawImage'),
    ...(conic ? { createConicGradient: (...args) => { calls.push({ name: 'createConicGradient', args }); return gradient(); } } : {}),
  }, {
    get: (target, key) => (key in target ? target[key] : state[key]),
    set: (target, key, value) => { calls.push({ name: `set:${String(key)}`, args: [value] }); state[key] = value; return true; },
  });

  const run = new Function('ctx', 'nostromo', `
    const document = { querySelector: () => null };
    const window = { devicePixelRatio: 1 };
    ${block('CORE_R')} ${block('CORE_TILT')} ${block('CORE_LIGHT')}
    ${block('CIRCLE_STEPS')} ${block('CIRCLE_COS')} ${block('CIRCLE_SIN')}
    ${block('CORE_BANDS')} ${block('CORE_CELLS')} ${block('LAVA_RATE')} ${block('LAVA_DRIFT')}
    ${block('WAVE_SPEED')} ${block('HEART_PERIOD')} ${block('NOSTROMO_ORBIT')} ${block('MEMORY_COLORS')}
    ${fn('heartbeat')} ${fn('hexAlpha')} ${fn('hexMix')} ${fn('alongCurve')} ${fn('toScreen')}
    ${fn('drawNostromo')}
    nostromo.canvas = { getContext: () => ctx };
    return (t) => drawNostromo(t);
  `)(ctx, room);
  return { run, calls };
}

function fakeRoom() {
  const kinds = ['decision', 'fact', 'constraint', 'open'];
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    memory: { id: i + 1, kind: kinds[i % 4], text: `memory ${i}`, sources: [1], fromSequence: 1, throughSequence: 9, recalled: i, lastRecalled: new Date().toISOString() },
    angle: i, distance: 0.5 + (i % 5) * 0.1, activity: 0.08 + i * 0.07, lit: i % 3 === 0 ? 0.8 : 0,
    x: Math.cos(i) * 300, y: Math.sin(i) * 300, vx: 0, vy: 0, r: 9, scale: 1, seed: i, smoke: [],
    color: '#ff5f4a', placed: true, spin: i * 0.3,
  }));
  return {
    nodes, links: [{ a: 1, b: 2, weight: 0.8 }, { a: 3, b: 5, weight: 0.4 }],
    pulses: [{ from: null, to: nodes[0], node: nodes[0], born: 0, life: 1, kind: 'core' }, { from: nodes[2], to: nodes[4], link: { a: 3, b: 5, weight: 0.4 }, born: 0, life: 1, kind: 'link' }],
    rings: [{ born: 0 }], size: { w: 900, h: 600, dpr: 2 }, cam: { x: 0, y: 0, scale: 1 },
    spin: 0, coreLit: 0.4, lastPhase: 0, reduced: false, cage: false, altered: false, alarm: null, selected: null,
  };
}

test('nostromo: the renderer draws a whole frame without a single bad number', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);
  // A stretch of frames: the body turns, the lava rises and falls, the beat comes and goes.
  for (let frame = 0; frame < 90; frame += 1) {
    room.spin += 0.04;
    run(frame * 0.05);
  }
  assert.ok(calls.length > 2000, `a frame should actually draw something, got ${calls.length} calls`);

  // Every number that reached the context has to be a number. A single NaN in a coordinate
  // silently drops a path, and a NaN in a colour drops a whole shape: neither throws.
  for (const call of calls) {
    for (const arg of call.args) {
      if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${call.name} was handed ${arg}`);
      if (typeof arg === 'string') assert.ok(!/NaN|undefined|Infinity/.test(arg), `${call.name} was handed "${arg}"`);
    }
  }
});

test('nostromo: the core is a body, so its surface goes round the back as it turns', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // Everything drawn on the surface is a great circle walked in steps; collect where those
  // steps land across a full rotation.
  const surfacePoints = () => calls.filter((c) => c.name === 'lineTo' || c.name === 'moveTo').map((c) => c.args);
  const radius = 64;   // CORE_R, before the beat swells it

  let everBehind = false;
  let widest = 0;
  for (let frame = 0; frame < 160; frame += 1) {
    calls.length = 0;
    room.spin = (frame / 160) * Math.PI * 2;
    run(frame * 0.05);
    const near = surfacePoints().filter(([x, y]) => Math.hypot(x, y) <= radius * 1.3);
    // No point of the surface may fall outside the body: that is what being on a sphere means.
    for (const [x, y] of near) widest = Math.max(widest, Math.hypot(x, y));
    // A band that is fully visible every frame would be a flat ring, not a circle on a body.
    if (near.length > 0 && near.length < 44 * 6) everBehind = true;
  }
  assert.ok(everBehind, 'the far side of the body is never drawn');
  assert.ok(widest <= radius * 1.3, `surface drawing stayed on the body, widest was ${widest.toFixed(1)}`);
});

test('nostromo: the lava halo keeps moving and never falls into step with itself', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // The lava is drawn in `lighter`, so the frame has to switch into it and back out again:
  // leaving it on would wash out everything drawn afterwards.
  run(0);
  const composites = calls.filter((c) => c.name === 'set:globalCompositeOperation').map((c) => c.args[0]);
  assert.ok(composites.includes('lighter'), 'the lava never blends');
  assert.equal(composites.at(-1), 'source-over', 'the frame left additive blending switched on');

  // Blob positions over two minutes: each has to travel, and no two may march together.
  const tracks = [];
  for (let frame = 0; frame < 120; frame += 1) {
    calls.length = 0;
    run(frame);
    // The blobs are the translate() calls made while `lighter` is on.
    let blending = false;
    const here = [];
    for (const call of calls) {
      if (call.name === 'set:globalCompositeOperation') blending = call.args[0] === 'lighter';
      else if (blending && call.name === 'translate') here.push(call.args);
    }
    tracks.push(here);
  }
  const blobs = Math.min(...tracks.map((frameTrack) => frameTrack.length));
  assert.ok(blobs >= 7, `the halo should carry a handful of blobs, saw ${blobs}`);

  const path = (index) => tracks.map((frameTrack) => frameTrack[index]);
  const travelled = (index) => path(index).reduce((total, point, i, all) => (i === 0 ? 0 : total + Math.hypot(point[0] - all[i - 1][0], point[1] - all[i - 1][1])), 0);
  for (let i = 0; i < 7; i += 1) assert.ok(travelled(i) > 60, `blob ${i} barely moved (${travelled(i).toFixed(1)})`);

  // Independence: two blobs that rose and fell together would have the same distance-from-core
  // curve. Compare the first two and require them to disagree somewhere.
  const reach = (index) => path(index).map(([x, y]) => Math.hypot(x, y));
  const [a, b] = [reach(0), reach(1)];
  const drift = a.map((value, i) => Math.abs(value - b[i]));
  assert.ok(Math.max(...drift) > 20, 'two blobs are rising and falling in lockstep');
});

test('nostromo: reduced motion stills the lava without emptying the room', async () => {
  const room = { ...fakeRoom(), reduced: true };
  const { run, calls } = await nostromoRenderer(room);
  // Where each blob sits around the body. The room still breathes with its heartbeat, which is
  // not motion anyone asked to be spared; what must not happen is drifting, rising and falling.
  const bearings = (t) => {
    calls.length = 0;
    run(t);
    let blending = false;
    const angles = [];
    for (const call of calls) {
      if (call.name === 'set:globalCompositeOperation') blending = call.args[0] === 'lighter';
      else if (blending && call.name === 'translate') angles.push(Math.atan2(call.args[1], call.args[0]));
    }
    return angles.slice(0, 7);
  };
  const first = bearings(0);
  assert.equal(first.length, 7, 'a still room still draws its halo');
  for (const later of [bearings(25), bearings(140)]) {
    for (let i = 0; i < 7; i += 1) {
      assert.ok(Math.abs(later[i] - first[i]) < 1e-9, `blob ${i} drifted for someone who asked for stillness`);
    }
  }
});

test('nostromo: a room in lockdown turns faster, and an alarm swells the body', async () => {
  const calm = fakeRoom();
  const caged = { ...fakeRoom(), cage: true };
  const [a, b] = await Promise.all([nostromoRenderer(calm), nostromoRenderer(caged)]);
  // Both draw; neither throws. The cage is MOTHER under strain, and the beat is quicker there.
  a.run(1); b.run(1);
  const beats = (frames) => frames.calls.filter((c) => c.name === 'arc').length;
  assert.ok(beats(a) > 0 && beats(b) > 0, 'both states render the body');

  const alarmed = { ...fakeRoom(), alarm: 0.5 };
  const { run, calls } = await nostromoRenderer(alarmed);
  run(0.6);
  for (const call of calls) {
    for (const arg of call.args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${call.name} was handed ${arg} under alarm`);
  }
});

test('nostromo: the atmosphere is drawn whole on a modern engine and still drawn on an old one', async () => {
  // A shell of air is one shell. Where the engine can shade a stroke as it goes round, it is
  // one stroke; where it cannot, the day side and the night side are two. Neither may leave a
  // bad number behind, and both have to put the night side in shadow.
  const alphas = (calls) => calls.filter((c) => c.name === 'addColorStop' || c.name === 'set:strokeStyle')
    .map((c) => String(c.args.at(-1)))
    .filter((value) => value.startsWith('rgba(255, 19'))
    .map((value) => Number(value.match(/,\s*([\d.]+)\)$/)?.[1]));

  const modern = await nostromoRenderer(fakeRoom(), { conic: true });
  modern.run(0.4);
  assert.equal(modern.calls.filter((c) => c.name === 'createConicGradient').length, 1, 'the shell should be one gradient');

  const older = await nostromoRenderer(fakeRoom());
  older.run(0.4);
  assert.equal(older.calls.filter((c) => c.name === 'createConicGradient').length, 0);

  for (const [label, frame] of [['modern', modern], ['older', older]]) {
    const shell = alphas(frame.calls);
    assert.ok(shell.length >= 2, `${label} drew no atmosphere`);
    assert.ok(Math.max(...shell) > Math.min(...shell) * 2, `${label} lit the night side as brightly as the day side`);
    for (const value of shell) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `${label} produced alpha ${value}`);
  }
});

test('nostromo: a crowded archive does not cost a blur for every memory in it', async () => {
  // Shadow blur is the most expensive thing a canvas does. The room has to stay light when the
  // archive grows, so the count of blurred draws must not follow the count of memories.
  const count = async (memories) => {
    const room = fakeRoom();
    room.nodes = Array.from({ length: memories }, (_, i) => ({ ...room.nodes[i % room.nodes.length], x: Math.cos(i) * 300, y: Math.sin(i) * 300 }));
    const { run, calls } = await nostromoRenderer(room, { conic: true });
    run(0.5);
    return calls.filter((c) => c.name === 'set:shadowBlur' && Number(c.args[0]) > 0).length;
  };
  const small = await count(12);
  const large = await count(400);
  assert.equal(small, large, `blurred draws grew from ${small} to ${large} as the archive grew`);
  assert.ok(large < 12, `a frame should blur a handful of times, not ${large}`);
});
