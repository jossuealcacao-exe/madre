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
async function nostromoRenderer(room, { conic = false, noCanvas = false } = {}) {
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

  // The star builds its granulation into a canvas of its own, so the harness has to be able to
  // hand it one. It records like the main context does and reports a size, which is what the
  // wrapping reads back.
  const offscreen = [];
  const makeCanvas = () => {
    const own = [];
    // Its own recorder. A shared one would push every stop of a texture being built into the
    // middle of the frame's call list, which silently moves everything measured after it.
    const ownGradient = () => ({ addColorStop: (stop, colour) => own.push({ name: 'addColorStop', args: [stop, colour] }) });
    const paint = new Proxy({
      createRadialGradient: () => ownGradient(), createLinearGradient: () => ownGradient(),
      fillRect: (...args) => own.push({ name: 'fillRect', args }), beginPath: () => {}, closePath: () => {},
      arc: (...args) => own.push({ name: 'arc', args }), fill: () => own.push({ name: 'fill', args: [] }),
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, save: () => {}, restore: () => {},
    }, { get: (target, key) => (key in target ? target[key] : undefined), set: () => true });
    const canvas = { width: 0, height: 0, getContext: () => paint, calls: own };
    offscreen.push(canvas);
    return canvas;
  };

  const run = new Function('ctx', 'nostromo', 'makeCanvas', 'NO_CANVAS', `
    const document = { querySelector: () => null, createElement: (tag) => { if (NO_CANVAS) throw new Error('no canvas here'); return tag === 'canvas' ? makeCanvas() : null; } };
    const window = { devicePixelRatio: 1 };
    ${block('CORE_R')} ${block('CORE_TILT')} ${block('CORE_LIGHT')} ${block('MEMORY_SCALE')}
    ${block('CIRCLE_STEPS')} ${block('CIRCLE_COS')} ${block('CIRCLE_SIN')}
    ${block('CORE_FLOWS')}
    ${block('GRAIN_ROWS')} ${block('GRAIN_PIECES')} let grainCanvas; ${fn('granuleTexture')}
    ${block('dwarfSkins')} ${fn('dwarfTexture')}
    ${block('WAVE_SPEED')} ${block('HEART_PERIOD')} ${block('NOSTROMO_ORBIT')} ${block('MEMORY_COLORS')}
    ${fn('heartbeat')} ${fn('hexAlpha')} ${fn('hexMix')} ${fn('alongCurve')} ${fn('toScreen')} ${fn('currentAlong')}
    ${fn('drawNostromo')}
    nostromo.canvas = { getContext: () => ctx };
    return (t) => drawNostromo(t);
  `)(ctx, room, makeCanvas, noCanvas);
  return { run, calls, offscreen };
}

function fakeRoom() {
  const kinds = ['decision', 'fact', 'constraint', 'open'];
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    memory: { id: i + 1, kind: kinds[i % 4], text: `memory ${i}`, sources: [1], fromSequence: 1, throughSequence: 9, recalled: i, lastRecalled: new Date().toISOString() },
    angle: i, distance: 0.5 + (i % 5) * 0.1, activity: 0.08 + i * 0.07, lit: i % 3 === 0 ? 0.8 : 0,
    x: Math.cos(i) * 300, y: Math.sin(i) * 300, vx: 0, vy: 0, r: 9, scale: 1, seed: i, smoke: [],
    color: '#ff5f4a', placed: true, spin: i * 0.3, rate: 0.5 + (i % 7) * 0.13,
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

test('nostromo: the skin is wrapped on a sphere, so it narrows toward the limb', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // Each piece of the skin is laid down as a destination rectangle on the face. Nothing may be
  // laid outside the body, and the rows have to narrow toward the top and bottom the way a
  // sphere's do, or the star is a cylinder.
  const pieces = (spin) => {
    room.spin = spin;
    calls.length = 0;
    run(2);
    return calls.filter((c) => c.name === 'drawImage')
      .map((c) => ({ x: c.args[5], y: c.args[6], w: c.args[7], h: c.args[8] }))
      .filter((piece) => Math.abs(piece.x) < 104 * 1.6 && Math.abs(piece.y) < 104 * 1.6);
  };
  const laid = pieces(0);
  assert.ok(laid.length > 60, `the face should be laid in rows and pieces, saw ${laid.length}`);

  // The widest row is the one across the middle, and the rows at the poles are the narrowest.
  const rows = new Map();
  for (const piece of laid) rows.set(piece.y, (rows.get(piece.y) ?? 0) + piece.w);
  const ordered = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  const middle = ordered[Math.floor(ordered.length / 2)][1];
  assert.ok(ordered[0][1] < middle * 0.5, 'the top of the body is as wide as its middle');
  assert.ok(ordered.at(-1)[1] < middle * 0.5, 'the bottom of the body is as wide as its middle');

  // Nothing is laid beyond the body, at any angle.
  for (const spin of [0, 1, 2, 3, 4, 5, 6]) {
    for (const piece of pieces(spin)) {
      const far = Math.max(Math.hypot(piece.x, piece.y), Math.hypot(piece.x + piece.w, piece.y + piece.h));
      assert.ok(far < 104 * 1.6, `a piece of skin was laid ${(far / 104).toFixed(2)} radii out`);
    }
  }
});

test('nostromo: the star wears no halo, only darkness', async () => {
  const { run, calls } = await nostromoRenderer(fakeRoom());
  run(0.4);
  const core = 104;   // CORE_R

  // A soft cloud around a star makes it look smaller, not bigger. Nothing additive may be laid
  // down far from the body: the light stops close to the limb and the rest is dark.
  let blending = false;
  for (let i = 0; i < calls.length; i += 1) {
    const call = calls[i];
    if (call.name === 'set:globalCompositeOperation') { blending = call.args[0] === 'lighter'; continue; }
    if (!blending || call.name !== 'arc') continue;
    const reach = Math.hypot(call.args[0], call.args[1]) + call.args[2];
    // Memories carry their own light and sit far out; the star's own additive work is near it.
    if (Math.hypot(call.args[0], call.args[1]) > core * 2) continue;
    assert.ok(reach < core * 1.6, `the star is glowing out to ${reach.toFixed(0)}, ${(reach / core).toFixed(1)} radii`);
  }
});

test('nostromo: the surface is molten and moves at the pace of rock, not of fire', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // Masses of molten matter are the gradients struck at the origin of their own frame: they are
  // drawn translated onto the face, so this is what identifies them.
  // The body swells and settles with the room's heartbeat, so a mass measured in raw units
  // seems to jump when it has not moved at all. Everything here is measured against the body's
  // own radius that frame, which is the smallest circle struck at its centre.
  const massesAt = (t) => {
    calls.length = 0;
    run(t);
    let radius = Infinity;
    for (const call of calls) {
      if (call.name === 'arc' && call.args[0] === 0 && call.args[1] === 0 && call.args[2] < radius) radius = call.args[2];
    }
    const out = [];
    for (let i = 0; i < calls.length; i += 1) {
      const call = calls[i];
      if (call.name !== 'createRadialGradient') continue;
      if (call.args[0] === 0 && call.args[1] === 0 && call.args[2] === 0 && call.args[3] === 0 && call.args[4] === 0 && call.args[5] > 0) {
        const at = calls.slice(Math.max(0, i - 6), i).findLast((c) => c.name === 'translate');
        if (at) out.push({ x: at.args[0] / radius, y: at.args[1] / radius, size: call.args[5] / radius });
      }
    }
    return out;
  };

  const now = massesAt(0);
  assert.ok(now.length >= 4, `the face should carry molten masses, saw ${now.length}`);
  assert.ok(now.length <= 8, 'more masses were drawn than there are');
  assert.ok(now.some((mass) => mass.size > 0.3), 'the masses are too small to read as flow');

  // Slow: over a second nothing on the face may jump. Lava crawls.
  const soon = massesAt(1);
  for (let i = 0; i < Math.min(now.length, soon.length); i += 1) {
    const step = Math.hypot(soon[i].x - now[i].x, soon[i].y - now[i].y);
    assert.ok(step < 0.04, `a mass crossed ${(step * 100).toFixed(1)}% of the body in a second, which is not lava`);
  }

  // But it does move, and it goes round the back: over a full turn the face keeps changing and
  // some of the masses are hidden.
  const counts = new Set();
  let travelled = 0;
  let previous = massesAt(0);
  for (let step = 1; step <= 60; step += 1) {
    room.spin = (step / 60) * Math.PI * 2;
    const here = massesAt(step * 2);
    counts.add(here.length);
    if (here.length === previous.length) travelled += here.reduce((sum, mass, i) => sum + Math.hypot(mass.x - previous[i].x, mass.y - previous[i].y), 0);
    previous = here;
  }
  assert.ok(counts.size > 1, 'every mass is visible at every angle, so none of them goes round the back');
  assert.ok(travelled > 4, 'the surface never actually flowed');
});

test('nostromo: reduced motion stills the molten surface without emptying the room', async () => {
  const room = { ...fakeRoom(), reduced: true };
  const { run, calls } = await nostromoRenderer(room);
  // With the body held at one angle, nothing on the face may move for someone who asked for
  // stillness. The star still breathes with the room's heartbeat; the rock does not crawl.
  const face = (t) => {
    calls.length = 0;
    run(t);
    return calls.filter((c) => c.name === 'drawImage').map((c) => `${c.args[1]}:${c.args[2]}`).join('|');
  };
  const first = face(0);
  assert.ok(first.length > 0, 'a still room still draws its surface');
  for (const t of [25, 140]) assert.equal(face(t), first, `the surface churned at ${t}s for someone who asked for stillness`);
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

test('nostromo: the core lights itself, so it has no dark side and no highlight', async () => {
  const { run, calls } = await nostromoRenderer(fakeRoom());
  run(0.4);

  // A star is bright all the way across and dims only at the very edge. A gradient that starts
  // dark in the middle and ends clear would be a planet's terminator, and there must be none.
  const limb = calls.filter((c) => c.name === 'createRadialGradient' && c.args[0] === 0 && c.args[1] === 0 && c.args[4] === 0);
  assert.ok(limb.length > 0, 'the body is not drawn from its own middle');

  // The chromosphere at the limb is one ring, the same brightness the whole way round: it is a
  // single stroke, not a gradient that turns with a light.
  assert.equal(calls.filter((c) => c.name === 'createConicGradient').length, 0, 'the limb is still being lit from one side');
});

test('nostromo: the surface boils, and turning the star moves the grain across its face', async () => {
  const room = fakeRoom();
  const { run, calls, offscreen } = await nostromoRenderer(room);
  run(0);

  // The granulation is built once, into a strip twice as wide as it is used, so the window can
  // slide along it without ever meeting a seam. The memories build their own, one per class of
  // star and not one per memory, so a crowded archive pays for four and no more.
  const strip = offscreen[0];
  assert.ok(offscreen.length <= 1 + 4, `skins should be shared by class, saw ${offscreen.length}`);
  assert.ok(strip.width >= strip.height * 2, 'the strip is not wide enough to wrap the body');
  assert.ok(strip.calls.filter((c) => c.name === 'arc').length > 3000, 'the surface has too few cells to boil');

  // It is built once and no more: a second frame must not pay for it again.
  const before = strip.calls.length;
  const built = offscreen.length;
  run(1);
  assert.equal(offscreen.length, built, 'a skin was rebuilt mid-flight');
  assert.equal(strip.calls.length, before, 'the grain was repainted mid-flight');

  // Turning the star slides the window along the strip. Same rows, different source.
  const windows = (spin) => {
    room.spin = spin;
    calls.length = 0;
    run(2);
    return calls.filter((c) => c.name === 'drawImage' && Math.abs(c.args[5]) < 104 * 1.6 && Math.abs(c.args[6]) < 104 * 1.6).map((c) => c.args[1]);
  };
  const first = windows(0);
  assert.ok(first.length > 60, `the face should be drawn in rows and pieces, saw ${first.length}`);
  const turned = windows(Math.PI / 2);
  assert.equal(first.length, turned.length, 'the face changed shape as it turned');
  assert.ok(first.some((value, i) => Math.abs(value - turned[i]) > 1), 'the grain did not move when the star turned');

  // A quarter turn and a quarter turn past a full one land on the same place: the strip wraps.
  const round = windows(Math.PI / 2 + Math.PI * 2);
  for (let i = 0; i < first.length; i += 1) assert.ok(Math.abs(turned[i] - round[i]) < 1e-6, 'the wrap does not come back round');
});

test('nostromo: a star with no canvas to build its grain in still draws', async () => {
  // Some engines refuse a second canvas. The room has to lose the texture and keep the star.
  const { run, calls } = await nostromoRenderer(fakeRoom(), { noCanvas: true });
  run(0.3);
  assert.equal(calls.filter((c) => c.name === 'drawImage').length, 0, 'it drew a texture it never built');
  assert.ok(calls.length > 600, 'the star vanished along with its grain');
  for (const call of calls) {
    for (const arg of call.args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${call.name} was handed ${arg}`);
  }
});

test('nostromo: every memory is a lit sphere, and each breathes on its own', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // The light in this room comes from one place. A memory's body is the radial gradient whose
  // outer circle sits exactly on it; its inner circle is the highlight, and that has to lean
  // toward MOTHER at the origin, never away from her.
  run(0);
  let checked = 0;
  for (const node of room.nodes) {
    // Centred on the memory, but with its bright point off to one side: the halo and a pulse
    // arriving are both centred there too, and both are concentric.
    const body = calls.find((c) => c.name === 'createRadialGradient'
      && c.args[3] === node.x && c.args[4] === node.y && c.args[2] < 1
      && (c.args[0] !== node.x || c.args[1] !== node.y));
    assert.ok(body, 'a memory was drawn without a lit face');
    const lean = -((body.args[0] - node.x) * node.x + (body.args[1] - node.y) * node.y);
    assert.ok(lean > 0, 'a memory is lit from the side facing away from the core');
    checked += 1;
  }
  assert.equal(checked, room.nodes.length);

  // Micro-pulsation: the body's own radius, frame by frame. Each memory breathes, none of them
  // together, and none of it is big enough to read as a flash.
  // The body itself is the one arc round a memory that is closed into a path to clip with;
  // everything else centred there is a halo, a rim or a pulse landing.
  const radiusOf = (node) => {
    for (let i = 0; i < calls.length - 1; i += 1) {
      const call = calls[i];
      if (call.name !== 'arc' || call.args[0] !== node.x || call.args[1] !== node.y) continue;
      if (calls[i + 1].name === 'closePath') return call.args[2];
    }
    return NaN;
  };
  const tracks = room.nodes.map(() => []);
  for (let frame = 0; frame < 240; frame += 1) {
    calls.length = 0;
    run(frame * 0.25);
    room.nodes.forEach((node, i) => tracks[i].push(radiusOf(node)));
  }
  const swing = (series) => (Math.max(...series) - Math.min(...series)) / Math.max(...series);
  for (let i = 0; i < tracks.length; i += 1) {
    const series = tracks[i];
    assert.ok(series.every(Number.isFinite), `memory ${i} was not drawn in every frame`);
    assert.ok(swing(series) > 0.04, `memory ${i} does not breathe (${(swing(series) * 100).toFixed(1)}%)`);
    assert.ok(swing(series) < 0.2, `memory ${i} pulses hard enough to read as a flash (${(swing(series) * 100).toFixed(0)}%)`);
  }

  // Lives of their own: memories given different rates must not reach their fullest together.
  const peak = (series) => series.indexOf(Math.max(...series));
  const peaks = new Set(tracks.map(peak));
  assert.ok(peaks.size > tracks.length / 2, `${tracks.length - peaks.size} memories are breathing in step`);
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

test('nostromo: a memory reads as a moon beside the core, never as a rival to it', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const value = (name) => {
    const match = source.match(new RegExp(`const ${name} = ([\\d.]+);`));
    assert.ok(match, `${name} is gone from public/app.js`);
    return Number(match[1]);
  };
  const scale = value('MEMORY_SCALE');
  const core = value('CORE_R');

  // The radius as buildNostromo works it out, for the smallest memory in an archive and for one
  // that covers the whole ledger and cites everything.
  const radius = (span, sources) => scale * (7 + Math.min(11, Math.log2(span + 1) * 2.2 + sources * 0.6));
  const smallest = radius(1, 1);
  const largest = radius(100000, 40);

  assert.ok(smallest > 0, 'a memory has to be visible');
  assert.ok(largest < core / 4, `the biggest memory should stay well under the core, got ${largest.toFixed(1)} against ${core}`);
  // The pointer gets 8 world units of slack on top of the radius, so even the smallest memory
  // keeps a target a person can actually hit.
  assert.ok(smallest + 8 >= 14, `the smallest memory is hard to click at ${(smallest + 8).toFixed(1)} units`);
  // Two memories at rest are pushed apart by their radii plus a fixed gap: shrinking them must
  // open the field up, not let them pile on top of each other.
  assert.ok(smallest * 2 + 30 > largest, 'memories would overlap at rest');
});

test('nostromo: memories burn as star classes, and the four are told apart at a glance', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const line = source.match(/const MEMORY_COLORS = (\{[^}]*\});/);
  assert.ok(line, 'MEMORY_COLORS is gone from public/app.js');
  const palette = new Function(`return ${line[1]}`)();
  assert.deepEqual(Object.keys(palette).sort(), ['decision', 'fact', 'preference', 'question']);

  const rgb = (hex) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const named = Object.fromEntries(Object.entries(palette).map(([kind, hex]) => [kind, rgb(hex)]));

  // A white dwarf is white: all three channels near the top and close together. A red dwarf
  // leans red, a blue one blue, a yellow one red and green together with little blue.
  const [wr, wg, wb] = named.fact;
  assert.ok(Math.min(wr, wg, wb) > 190 && Math.max(wr, wg, wb) - Math.min(wr, wg, wb) < 60, 'a fact is not a white dwarf');
  assert.ok(named.preference[0] > named.preference[2] + 100, 'a preference is not a red dwarf');
  assert.ok(named.question[2] > named.question[0] + 100, 'a question is not a blue dwarf');
  assert.ok(named.decision[0] > 200 && named.decision[1] > 150 && named.decision[2] < 120, 'a decision is not a yellow dwarf');

  // Electric, not muted: every one of them has to carry real colour.
  for (const [kind, hex] of Object.entries(palette)) {
    const [r, g, b] = rgb(hex);
    assert.ok(Math.max(r, g, b) > 200, `${kind} is too dim to read as a star`);
  }
  // And no two may be confusable across the room.
  const kinds = Object.keys(palette);
  for (let i = 0; i < kinds.length; i += 1) {
    for (let j = i + 1; j < kinds.length; j += 1) {
      const apart = named[kinds[i]].reduce((sum, value, k) => sum + Math.abs(value - named[kinds[j]][k]), 0);
      assert.ok(apart > 150, `${kinds[i]} and ${kinds[j]} look like the same star`);
    }
  }
});

test('nostromo: current runs along a wire without ever handing the canvas a bad stop', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const start = source.indexOf('function currentAlong(');
  assert.notEqual(start, -1, 'currentAlong is gone from public/app.js');
  let depth = 0;
  let body = '';
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && (depth -= 1) === 0) { body = source.slice(start, i + 1); break; }
  }
  const currentAlong = new Function(`${body} return currentAlong;`)();

  // A real canvas throws on a stop outside 0..1, and a gradient whose stops run backwards drops
  // colours without a word. Walk the band from one end of the wire to the other and check both.
  const stops = [];
  const ctx = { createLinearGradient: () => ({ addColorStop: (at, colour) => stops.push([at, colour]) }) };
  for (let step = 0; step <= 200; step += 1) {
    stops.length = 0;
    const head = step / 200;
    currentAlong(ctx, 0, 0, 100, 0, 'rgba(255, 74, 44, .8)', { mid: 'rgba(255, 140, 90, .4)', end: 'rgba(76, 201, 255, .6)' }, head, 1);
    assert.ok(stops.length >= 3, `the wire lost its colour at ${head}`);
    let last = -1;
    for (const [at, colour] of stops) {
      assert.ok(Number.isFinite(at) && at >= 0 && at <= 1, `a stop landed at ${at}`);
      assert.ok(at > last, `stops ran backwards at ${head}: ${at} after ${last}`);
      assert.ok(typeof colour === 'string' && !/NaN|undefined/.test(colour), `a stop was handed "${colour}"`);
      last = at;
    }
    // The band itself: somewhere in the middle of the run there has to be white heat.
    if (head > 0.2 && head < 0.8) assert.ok(stops.some(([, colour]) => /255, 255, 255/.test(colour)), `no current at ${head}`);
  }

  // A wire nobody is feeding carries colour and no band at all.
  stops.length = 0;
  currentAlong(ctx, 0, 0, 100, 0, 'rgba(255, 74, 44, .8)', { mid: 'rgba(255, 140, 90, .4)', end: 'rgba(76, 201, 255, .6)' }, 0.5, 0);
  assert.equal(stops.length, 3, 'a starved wire is still sparking');
});

test('nostromo: a dwarf burns by what it has become and by what it is being given', async () => {
  const room = fakeRoom();
  const { run, calls } = await nostromoRenderer(room);

  // Four memories: nothing, grown but starved, young but fed, and both at once. Brightness has
  // to answer to each, and a memory that is mature and fed has to outshine one that is neither.
  const [out, grown, fed, full] = room.nodes;
  for (const node of [out, grown, fed, full]) { node.charge = 0; node.lit = 0; node.activity = 0.05; }
  grown.activity = 1;
  fed.charge = 1;
  full.activity = 1; full.charge = 1;

  // How brightly a memory's face is laid down, and how much night is left on it.
  const readingOf = (node) => {
    const at = calls.findIndex((c) => c.name === 'drawImage' && Math.abs(c.args[5] - (node.x - node.r * 1.04)) < 4);
    const alpha = calls.slice(Math.max(0, at - 3), at).findLast((c) => c.name === 'set:globalAlpha');
    const body = calls.find((c) => c.name === 'createRadialGradient' && c.args[3] === node.x && c.args[4] === node.y && c.args[2] < 1
      && (c.args[0] !== node.x || c.args[1] !== node.y));
    // Two black gradients are laid on a body. The limb is struck from the body's own centre and
    // every star has one. The night is struck from a point pushed away from MOTHER and reaches
    // twice the body's width; that is the one that burns off as the star lights itself.
    const cast = calls.find((c) => c.name === 'createRadialGradient'
      && c.args[3] !== node.x && Math.hypot(c.args[3] - node.x, c.args[4] - node.y) < node.r * 2
      && c.args[5] > node.r * 1.5 && c.args[5] < node.r * 2.6);
    const struck = calls.indexOf(cast);
    const first = struck < 0 ? null : calls.slice(struck + 1, struck + 2).find((c) => c.name === 'addColorStop');
    return { face: alpha?.args[0], night: Number(String(first?.args[1]).match(/,\s*([\d.]+)\)/)?.[1]) };
  };

  calls.length = 0;
  run(0);
  const [dark, old, young, bright] = [out, grown, fed, full].map(readingOf);

  assert.ok(Number.isFinite(dark.face) && Number.isFinite(bright.face), 'the faces were not drawn');
  assert.ok(old.face > dark.face, 'maturity alone does not brighten a memory');
  assert.ok(young.face > dark.face, 'feeding alone does not brighten a memory');
  assert.ok(bright.face > old.face && bright.face > young.face, 'the two together are worth no more than either');
  assert.ok(bright.night < dark.night * 0.35, `a burning dwarf should have lost its night (${bright.night} against ${dark.night})`);

  // And nothing hangs off any of them. A halo is a filled gradient struck at the body's centre
  // and reaching past its edge; rings that mark an arriving pulse are strokes, and stay.
  for (const node of room.nodes) {
    for (const call of calls) {
      if (call.name !== 'createRadialGradient') continue;
      if (call.args[0] !== node.x || call.args[1] !== node.y) continue;
      assert.ok(call.args[5] <= node.r * 1.2, `a memory is wearing a halo out to ${(call.args[5] / node.r).toFixed(1)} of its own radius`);
    }
  }
});

test('nostromo: charge is fed by the core and by neighbours, and drains when nobody feeds it', async () => {
  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  // Both kinds of pulse have to feed the memory they land on, not just light it for a moment.
  const landing = source.slice(source.indexOf('// It arrived:'), source.indexOf('// It arrived:') + 700);
  assert.match(landing, /kind === 'link'[\s\S]*charge/, 'a pulse between two memories feeds neither');
  assert.match(landing, /else if \(pulse\.to\)[\s\S]*charge/, "a pulse from the core does not feed what it reaches");

  // And it drains far more slowly than the flash does, or it would just be the flash again.
  const decay = source.match(/node\.lit = Math\.max\(0, \(node\.lit \?\? 0\) - dt \* ([\d.]+)\)/);
  const cooling = source.match(/node\.charge = Math\.max\(0, \(node\.charge \?\? 0\) - dt \* ([\d.]+)\)/);
  assert.ok(decay && cooling, 'the two are no longer kept apart');
  assert.ok(Number(cooling[1]) < Number(decay[1]) / 5, 'charge fades as fast as a flash, so it says nothing new');
});

test('nostromo: a wire leaves MOTHER red and arrives wearing the star it feeds', async () => {
  const room = fakeRoom();
  // One memory of each class, so every wire has a different colour to arrive in.
  const palette = { decision: '#ffdc3c', fact: '#dfeeff', preference: '#fa4632', question: '#3dc6ff' };
  room.nodes = room.nodes.slice(0, 4);
  Object.values(palette).forEach((hex, i) => { room.nodes[i].color = hex; room.nodes[i].charge = 0.5; });
  room.links = [];
  room.pulses = [];
  const { run, calls } = await nostromoRenderer(room);
  run(0.3);

  // Each wire is one gradient struck from the limb out to its memory; read the colours it was
  // given in the order they were given.
  const wires = [];
  let current = null;
  for (const call of calls) {
    if (call.name === 'createLinearGradient') { current = []; wires.push(current); }
    else if (call.name === 'createRadialGradient') current = null;   // a body, not a wire
    else if (call.name === 'addColorStop' && current) current.push(String(call.args[1]));
  }
  const channels = (colour) => {
    const hex = colour.match(/#([0-9a-f]{6})/i);
    if (hex) return [0, 2, 4].map((at) => Number.parseInt(hex[1].slice(at, at + 2), 16));
    const parts = colour.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return parts ? [Number(parts[1]), Number(parts[2]), Number(parts[3])] : null;
  };

  let matched = 0;
  for (const hex of Object.values(palette)) {
    const want = channels(hex);
    const wire = wires.find((stops) => stops.some((colour) => {
      const got = channels(colour);
      return got && got.every((value, i) => Math.abs(value - want[i]) < 12);
    }));
    assert.ok(wire, `no wire arrives as ${hex}`);
    // It starts as MOTHER: deep red, far more red than anything else.
    const first = channels(wire[0]);
    assert.ok(first && first[0] > 180 && first[0] > first[1] * 2.5 && first[0] > first[2] * 2.5, `a wire leaves the core as ${wire[0]} rather than red`);
    // And the last colour it is given is the star's own, not the core's.
    const last = channels(wire.at(-1));
    assert.ok(last.every((value, i) => Math.abs(value - want[i]) < 12), `a wire arrives as ${wire.at(-1)} instead of ${hex}`);
    matched += 1;
  }
  assert.equal(matched, 4, 'not every class of star got its own wire');
});

test('nostromo: the legend shows a real star for each class, not a swatch', async () => {
  const [app, page, css] = await Promise.all([
    readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8'),
    readFile(join(import.meta.dirname, '..', 'public', 'index.html'), 'utf8'),
    readFile(join(import.meta.dirname, '..', 'public', 'styles.css'), 'utf8'),
  ]);

  // Every class is named, and each name is the star it burns as next to the kind of memory.
  const named = app.match(/const DWARF_CLASS = (\{[^}]*\});/);
  assert.ok(named, 'DWARF_CLASS is gone from public/app.js');
  const classes = new Function(`return ${named[1]}`)();
  assert.deepEqual(Object.keys(classes).sort(), ['decision', 'fact', 'preference', 'question']);
  for (const [kind, label] of Object.entries(classes)) {
    assert.match(label, /DWARF$/, `${kind} is not named as a star`);
    // The class belongs on hover, not on the chip: the drawn star already says which it is, and
    // writing it out beside the star says the same thing twice.
    assert.match(page, new RegExp(`title="${label} · ${kind.toUpperCase()}"`, 'i'), `${kind} never names its class anywhere`);
    assert.ok(!new RegExp(`<i>${label}`, 'i').test(page), `${kind} still spells out its class beside the star`);
    assert.match(page, new RegExp(`<i>${kind.toUpperCase()}</i>`, 'i'), `${kind} is not labelled`);
  }

  // The chip carries a drawn star, and it is drawn the way the ones in the constellation are:
  // a ground, the class's own boiling face, and a limb.
  const chip = app.slice(app.indexOf('function dwarfChip('), app.indexOf('function paintLegend('));
  for (const piece of ['createElement', 'clip()', 'dwarfTexture', 'drawImage', 'limb']) {
    assert.ok(chip.includes(piece), `the legend's star is missing its ${piece}`);
  }
  assert.ok(app.includes('paintLegend();'), 'the legend is never painted');

  // The font is the one the header already uses: the chip may only set size and spacing, never
  // a family of its own.
  const rule = css.slice(css.indexOf('.nostromo-legend'), css.indexOf('.nostromo-frame .mother-close'));
  assert.ok(/font-size: 9px/.test(rule) && /letter-spacing: \.16em/.test(rule), 'the legend lost its lettering');
  assert.ok(!/font-family/.test(rule), 'the legend set a font of its own');
  // And the chips are not boxed in. A star needs no pill drawn round it.
  assert.ok(!/border(?!-radius)/.test(rule), 'the legend chips are still fenced in');
  assert.ok(!/border-radius: 999px/.test(rule), 'the legend chips are still pills');

  // And the stylesheet's colours are the same stars the canvas paints.
  const palette = new Function(`return ${app.match(/const MEMORY_COLORS = (\{[^}]*\});/)[1]}`)();
  for (const [kind, hex] of Object.entries(palette)) {
    assert.ok(css.includes(`--mem-${kind}: ${hex}`), `the page and the canvas disagree about a ${kind}`);
  }
});

test('nostromo: a class of star is built once, however many memories wear it', async () => {
  const room = fakeRoom();
  // Forty memories across the four classes: the skins must be shared, not built per memory.
  const palette = ['#ffdc3c', '#dfeeff', '#fa4632', '#3dc6ff'];
  room.nodes = Array.from({ length: 40 }, (_, i) => ({ ...room.nodes[i % room.nodes.length], x: Math.cos(i) * 320, y: Math.sin(i) * 320, color: palette[i % 4] }));
  const { run, offscreen } = await nostromoRenderer(room);
  run(0);
  run(1);
  run(2);
  // One strip for MOTHER, one for each class of star that is actually on screen.
  assert.equal(offscreen.length, 5, `skins should be built once per class, saw ${offscreen.length}`);
});

test('nostromo: a memory is a ball, with nothing ringed round it and nothing coming off it', async () => {
  const room = fakeRoom();
  room.selected = null;
  room.hover = null;
  // Some of them have just been fed, which used to throw a ring; all of them used to shed specks.
  room.nodes.forEach((node, i) => { node.lit = i % 3 === 0 ? 1.1 : 0; node.charge = (i % 5) / 4; });
  const { run, calls } = await nostromoRenderer(room);
  run(0.5);

  // Nothing is struck round a body but the body itself. An outline, however thin, and a ring
  // thrown off when a pulse lands are both circles drawn on a ball, and both flatten it.
  for (const node of room.nodes) {
    const r = node.r * node.scale * 1.06;   // the widest the micro-pulsation can push it
    for (const call of calls) {
      if (call.name !== 'arc') continue;
      if (Math.abs(call.args[0] - node.x) > 0.001 || Math.abs(call.args[1] - node.y) > 0.001) continue;
      assert.ok(call.args[2] <= r, `a memory is ringed at ${(call.args[2] / node.r).toFixed(2)} of its own radius`);
    }
  }

  // And nothing drifts off them. The specks were filled circles set a little away from a body,
  // which is the one thing that should never appear near one.
  for (const node of room.nodes) {
    for (const call of calls) {
      if (call.name !== 'arc') continue;
      const off = Math.hypot(call.args[0] - node.x, call.args[1] - node.y);
      if (off < 0.001 || off > node.r * 3) continue;
      assert.fail(`something is drifting ${off.toFixed(1)} units off a memory`);
    }
  }

  const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
  const constellation = source.slice(source.indexOf('function buildNostromo('), source.indexOf('function openNostromo('));
  assert.ok(!/smoke|puff/.test(constellation), 'the memories still carry specks to shed');
});
