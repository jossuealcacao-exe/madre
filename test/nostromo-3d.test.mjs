import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// NOSTROMO is a body in space now. The physics runs in three dimensions and each frame is turned
// and projected onto the screen. Both halves are lifted out of the shipped client and run here.
// The physics and the painters ship in the engine (nostromo-engine.js); the room's doors and the
// chart it draws on a phone ship in the page. One string, the engine first, so each name is found
// where it lives.
const engine = await readFile(join(import.meta.dirname, '..', 'public', 'nostromo-engine.js'), 'utf8');
const page = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
const source = `${engine}\n${page}`;
const fn = (name) => {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from public/app.js`);
  let depth = 0;
  // The body starts after the signature: a parameter list may hold braces of its own.
  for (let i = source.indexOf(') {', start) + 2; i < source.length; i += 1) {
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
    if ('[{('.includes(source[i])) depth += 1;
    else if (']})'.includes(source[i])) depth -= 1;
    else if (source[i] === ';' && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} does not close`);
};

function world(nostromo) {
  return new Function('nostromo', `
    ${block('NOSTROMO_ORBIT')} ${block('CORE_R')} ${block('FISSURE')} ${block('BRAIN_WIDTH')} ${block('VIEW_DISTANCE')}
    ${block('frac')} ${block('shellDepth')} ${block('HEART_PERIOD')} ${block('PULSE_SPEED')} ${block('PULSE_CAP')}
    ${fn('brainRadius')} ${fn('heartbeat')} ${fn('pulseNostromo')} ${fn('stepNostromo')} ${fn('projectNostromo')}
    return { step: stepNostromo, project: projectNostromo };
  `)(nostromo);
}

// A seeded scatter, so a failure is the same failure every time.
function scatter(n) {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: n }, (_, i) => ({
    memory: { id: i + 1 }, distance: 0.42 + rand() * 0.5, activity: 0.3, r: 9, scale: 1, seed: rand() * Math.PI * 2,
    wx: (rand() - 0.5) * 500, wy: (rand() - 0.5) * 400, wz: (rand() - 0.5) * 20, x: 0, y: 0,
  }));
}

test('nostromo 3d: the archive settles into two hemispheres, longer than it is wide, with the fissure between', () => {
  const nostromo = { nodes: scatter(60), links: [], rings: [], reduced: true, lastPhase: 0 };
  const { step } = world(nostromo);
  for (let i = 0; i < 700; i += 1) step(1, i / 60);

  const left = nostromo.nodes.filter((node) => node.wz < 0).length;
  const right = nostromo.nodes.length - left;
  assert.ok(left >= 15 && right >= 15, `one hemisphere is empty: ${left} left, ${right} right`);
  // Nobody lives in the fissure: started within ten units of the midline, they all left it.
  const inGap = nostromo.nodes.filter((node) => Math.abs(node.wz) < 0.4 * 0.07 * 300).length;
  assert.ok(inGap <= 3, `${inGap} memories sit on the midline, where the fissure is`);
  // Front to back is the long axis; ear to ear is shorter.
  const reach = (key) => Math.max(...nostromo.nodes.map((node) => Math.abs(node[key])));
  assert.ok(reach('wx') > reach('wz'), `it is wider (${reach('wz').toFixed(0)}) than it is long (${reach('wx').toFixed(0)})`);
  for (const node of nostromo.nodes) for (const key of ['wx', 'wy', 'wz']) assert.ok(Number.isFinite(node[key]), `${key} ran away`);
});

test('nostromo 3d: turning the body moves depth across the screen, and nearer is bigger', () => {
  const near = { memory: { id: 1 }, wx: 0, wy: 0, wz: 200, r: 10, x: 0, y: 0 };
  const far = { memory: { id: 2 }, wx: 0, wy: 0, wz: -200, r: 10, x: 0, y: 0 };
  const nostromo = { nodes: [near, far], yaw: 0, pitch: 0 };
  const { project } = world(nostromo);

  // Seen from the side, depth is depth: both on the axis, the near one larger.
  project();
  assert.ok(Math.abs(near.x) < 1e-9 && Math.abs(far.x) < 1e-9);
  assert.ok(near.depth > 0 && far.depth < 0, 'depth points the wrong way');
  assert.ok(near.r > 10 && far.r < 10, 'perspective does not make the nearer memory bigger');
  // The physics radius is kept apart from the drawn one, so turning never changes the spacing.
  assert.equal(near.r3, 10);

  // A quarter turn: what was in front is now to one side, and what was behind to the other.
  nostromo.yaw = Math.PI / 2;
  project();
  assert.ok(near.x > 150 && far.x < -150, `a quarter turn left them at ${near.x.toFixed(0)} and ${far.x.toFixed(0)}`);
  assert.ok(Math.abs(near.depth) < 1e-9, 'a quarter turn kept the depth');
  assert.ok(Math.abs(near.r - 10) < 1e-9, 'a memory beside MOTHER is drawn bigger or smaller than it is');

  // Tipping the head forward brings the front of it up.
  nostromo.yaw = 0;
  nostromo.pitch = 0.6;
  project();
  assert.ok(near.y < 0 && far.y > 0, 'pitch tipped the head the other way');
});

test('nostromo 3d: dragging turns the archive, Shift+drag moves the camera, and it says so', async () => {
  const handler = source.slice(source.indexOf("nostromo.canvas?.addEventListener('mousemove'"), source.indexOf("window.addEventListener?.('mouseup'"));
  assert.match(handler, /if \(drag\.pan && nostromoLive\(\)\) \{[\s\S]*nostromo\.cam\.x -= dx/, 'Shift+drag no longer moves the camera');
  assert.match(handler, /const turned = turnBy\(nostromo\.yaw \?\? 0, nostromo\.pitch \?\? 0, dx, dy\);/, 'a drag does not turn the body');
  // Since 2026-10-27 it turns any way, over the top and under; past the pole a sideways drag
  // still follows the hand.
  const turnBy = new Function(`${block('TURN_PER_PIXEL')} ${block('turnBy')} return turnBy;`)();
  const over = turnBy(0, 0, 0, 250);
  assert.ok(over.pitch > 1.9, `the head stops before going over: ${over.pitch}`);
  assert.ok(Math.abs(turnBy(0, 0, 0, 500).pitch) <= Math.PI, 'the turn is not kept within one round');
  assert.ok(turnBy(0, Math.PI, 10, 0).yaw < 0, 'upside down, a sideways drag turns against the hand');
  assert.ok(turnBy(0, 0, 10, 0).yaw > 0);
  assert.match(source, /drag\.pan = event\.shiftKey/);
  // RECENTER brings back the side view as well as the camera.
  assert.match(source, /#nostromo-recenter'\)\?\.addEventListener\('click', \(event\) => \{[\s\S]*?nostromo\.yaw = 0;\n  nostromo\.pitch = 0;/);
  // On a phone the same key frames the whole chart again.
  assert.match(source, /if \(nostromo\.flat\) \{ flatFrame\(\); flatPaint\(\); return; \}/);
  const page = await readFile(join(import.meta.dirname, '..', 'public', 'index.html'), 'utf8');
  assert.match(page, /DRAG TO TURN · SHIFT\+DRAG TO MOVE/, 'the help line still says dragging moves');
});


// The planet shader, lifted out and run on its own: a table, a surface map and the light in, pixels
// out (2026-11-15: the memories are planets, lit by the sun at the centre).
function shader() {
  return new Function(`
    ${block('PLANETS')} ${block('planetOf')} ${block('PLANET_HALO')} ${block('SUN_LIGHT')} ${block('PLANET_AMBIENT')}
    ${block('ALBEDO_W')} ${block('ALBEDO_H')} ${block('PLANET_STRIDE')} ${block('planetMaps')} ${block('globeTables')} ${block('GLOBE_STRIDE')} ${block('CRATER')} ${block('smooth')}
    ${block('NOISE_PERM')} ${fn('gradientNoise')} ${fn('fractalNoise')} ${fn('craterField')} ${fn('planetSurface')} ${fn('planetMap')}
    ${fn('globeTable')} ${fn('lightTexel')} ${fn('haloInto')} ${fn('shadePlanet')} ${block('PLANET_ROWS_PER_FRAME')} ${fn('buildPlanets')}
    return { planetMap, globeTable, shadePlanet, buildPlanets, planetMaps, PLANETS, PLANET_STRIDE, ALBEDO_W, ALBEDO_H };
  `)();
}
const brightness = (out, size, x, y) => { const p = (y * size + x) * 4; return out[p] + out[p + 1] + out[p + 2]; };
const unit = (v) => { const n = Math.hypot(...v); return v.map((value) => value / n); };
// A surface with nothing on it — one colour, flat, dry, clear — so what is read is the light and
// not the weather.
const plainMap = (length, stride, colour = [0.5, 0.5, 0.5]) => { const map = new Float32Array(length); for (let i = 0; i < length; i += stride) map.set(colour, i); return map; };

test('nostromo 3d: a planet is lit by the sun: day toward it, night away, and the terminator follows the light', () => {
  const { planetMap, globeTable, shadePlanet, PLANETS, PLANET_STRIDE } = shader();
  const size = 64;
  for (const kind of Object.keys(PLANETS)) {
    const halo = PLANETS[kind].air ? 1.16 : 1;
    const table = globeTable(size, halo);
    const map = plainMap(planetMap(kind).length, PLANET_STRIDE);
    const paint = (light) => shadePlanet(new Uint8ClampedArray(size * size * 4), table, map, { kind, light: unit(light) });
    // The sun to the left: the left half is day, the right half night.
    const left = paint([-1, 0, 0.05]);
    const R = size / 2 / halo;
    const day = brightness(left, size, Math.round(size / 2 - R * 0.6), size / 2);
    const night = brightness(left, size, Math.round(size / 2 + R * 0.6), size / 2);
    assert.ok(day > night * 3, `${kind}: the side toward the sun (${day}) is not day against the night (${night})`);
    // Night is nearly black, but not nothing: a little light from everything else, enough to tell
    // which planet it is.
    assert.ok(night > 0 && night < 120, `${kind}: the night side reads ${night}`);
    // Move the sun and the terminator follows it.
    const right = paint([1, 0, 0.05]);
    assert.ok(brightness(right, size, Math.round(size / 2 + R * 0.6), size / 2) > brightness(right, size, Math.round(size / 2 - R * 0.6), size / 2) * 3, `${kind}: the day did not follow the sun`);
    // The sun behind us: the whole face is day. The sun behind the planet: the face is night.
    const full = paint([0, 0, 1]);
    const dark = paint([0, 0, -1]);
    assert.ok(brightness(full, size, size / 2, size / 2) > brightness(dark, size, size / 2, size / 2) * 4, `${kind}: a full planet is no brighter than a new one`);
    // Outside the planet and its air, nothing is painted.
    assert.equal(full[3], 0, `${kind}: a corner outside the body was painted`);
  }
});

test('nostromo 3d: the air is a halo on the side the sun is on, and all the way round with the sun behind', () => {
  const { planetMap, globeTable, shadePlanet, PLANET_STRIDE } = shader();
  const size = 96;
  const table = globeTable(size, 1.16);
  const map = plainMap(planetMap('preference').length, PLANET_STRIDE, [0.05, 0.1, 0.3]);
  const R = size / 2 / 1.16;
  // A pixel of the halo, just past the limb, on the left and on the right.
  const haloAt = (out, side) => out[((size / 2) * size + Math.round(size / 2 + side * (R + 1.5))) * 4 + 3];
  const lit = shadePlanet(new Uint8ClampedArray(size * size * 4), table, map, { kind: 'preference', light: unit([-1, 0, 0.1]) });
  assert.ok(haloAt(lit, -1) > 40, `there is no air on the side of the sun (${haloAt(lit, -1)})`);
  assert.ok(haloAt(lit, 1) < haloAt(lit, -1) / 3, 'the air glows as much on the night side');
  const behind = shadePlanet(new Uint8ClampedArray(size * size * 4), table, map, { kind: 'preference', light: unit([0, 0.05, -1]) });
  assert.ok(haloAt(behind, -1) > 40 && haloAt(behind, 1) > 40, 'with the sun behind it, the air does not ring the planet');
  // Mercury has no air: nothing past its limb, whatever the light.
  const bare = globeTable(size, 1);
  assert.equal(bare.ring.length, 0, 'Mercury was given room for an atmosphere');
});

test('nostromo 3d: each planet has its own surface: craters on Mercury, a cap of ice on Mars, oceans and clouds on the Earth, a smooth Uranus', () => {
  const { planetMap, globeTable, shadePlanet, buildPlanets, planetMaps, PLANET_STRIDE, ALBEDO_W, ALBEDO_H } = shader();
  // Built a band at a time, handed out only whole, and once per planet.
  assert.equal(planetMap('fact', 8), null, 'a half-built map was handed out');
  // Whoever paints only now and then (the Macroverso) builds them all, a band a call, even the ones
  // no universe on screen has.
  let calls = 0;
  while (!buildPlanets() && calls < 200) calls += 1;
  assert.ok(calls < 200 && ['fact', 'decision', 'preference', 'question'].every((kind) => planetMaps.get(kind)?.done), 'the planets were never all built');
  const mercury = planetMap('fact');
  assert.ok(mercury, 'the map never finished');
  assert.equal(planetMap('fact'), mercury, 'a planet\'s surface was built twice');
  const maps = Object.fromEntries(['fact', 'decision', 'preference', 'question'].map((kind) => [kind, planetMap(kind)]));
  assert.notDeepEqual(maps.fact.slice(0, 64), maps.decision.slice(0, 64), 'two planets share one surface');
  const channel = (map, k, rows = [0, ALBEDO_H]) => { const out = []; for (let row = rows[0]; row < rows[1]; row += 1) for (let col = 0; col < ALBEDO_W; col += 1) out.push(map[(row * ALBEDO_W + col) * PLANET_STRIDE + k]); return out; };
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const spread = (values) => { const m = mean(values); return Math.sqrt(mean(values.map((value) => (value - m) ** 2))); };
  const middle = [Math.round(ALBEDO_H * 0.3), Math.round(ALBEDO_H * 0.7)];

  // Mercury: grey, and its relief is craters.
  const [mr, mg, mb] = [0, 1, 2].map((k) => mean(channel(mercury, k)));
  assert.ok(Math.max(mr, mg, mb) - Math.min(mr, mg, mb) < 0.08, 'Mercury is not grey');
  assert.ok(spread(channel(mercury, 5)) > 0.1, 'Mercury has no craters');
  // Uranus: smooth, pale cyan.
  assert.ok(spread(channel(maps.question, 0)) < 0.03, 'Uranus is mottled');
  assert.equal(spread(channel(maps.question, 5)), 0, 'Uranus has relief');
  assert.ok(mean(channel(maps.question, 2)) > mean(channel(maps.question, 0)) + 0.15, 'Uranus is not cyan');
  // Mars: rust at the equator, ice at a pole.
  const marsRed = mean(channel(maps.decision, 0, middle));
  const marsGreen = mean(channel(maps.decision, 1, middle));
  assert.ok(marsRed > marsGreen * 1.4, 'Mars is not red');
  const pole = mean(channel(maps.decision, 2, [0, 3]));
  assert.ok(pole > 0.8, `Mars has no cap of ice (${pole.toFixed(2)})`);
  // The Earth: water over most of it, land on the rest, and clouds over about half.
  const wet = mean(channel(maps.preference, 3).map((value) => (value > 0.5 ? 1 : 0)));
  assert.ok(wet > 0.45 && wet < 0.8, `the Earth is ${(wet * 100).toFixed(0)}% water`);
  const cloud = mean(channel(maps.preference, 4));
  assert.ok(cloud > 0.15 && cloud < 0.7, `the Earth's sky is ${(cloud * 100).toFixed(0)}% cloud`);

  // The relief catches the light: with the sun low, a cratered face is far rougher than a flat one.
  const size = 96;
  const table = globeTable(size, 1);
  const grazing = unit([-1, 0, 0.35]);
  const flat = new Float32Array(mercury);
  for (let i = 0; i < flat.length; i += PLANET_STRIDE) { flat[i + 5] = 0; flat[i + 6] = 0; flat[i + 7] = 0; }
  const rough = (map) => { const out = shadePlanet(new Uint8ClampedArray(size * size * 4), table, map, { kind: 'fact', light: grazing }); const row = []; for (let x = 20; x < 48; x += 1) for (let y = 36; y < 60; y += 1) row.push(brightness(out, size, x, y)); return spread(row); };
  assert.ok(rough(mercury) > rough(flat) * 1.5, 'the craters do not catch the light');

  // The sun glints on the Earth's water and not on its land.
  const glossy = plainMap(maps.preference.length, PLANET_STRIDE, [0.05, 0.1, 0.25, 1]);
  const dry = plainMap(maps.preference.length, PLANET_STRIDE, [0.05, 0.1, 0.25, 0]);
  const sea = (map) => brightness(shadePlanet(new Uint8ClampedArray(size * size * 4), globeTable(size, 1.16), map, { kind: 'preference', light: [0, 0, 1] }), size, size / 2, size / 2);
  assert.ok(sea(glossy) > sea(dry) + 60, 'the sun does not glint on the water');
});

test('nostromo 3d: a planet turns, shows more light the more it is used, fades out of circulation, and the one being read is lit from the front', () => {
  const { planetMap, globeTable, shadePlanet } = shader();
  const size = 80;
  const table = globeTable(size, 1);
  const map = planetMap('decision');
  const at = (options) => shadePlanet(new Uint8ClampedArray(size * size * 4), table, map, { kind: 'decision', light: unit([-0.5, -0.3, 0.8]), ...options });
  // Turning moves the face.
  const still = at({ turn: 0 });
  const turned = at({ turn: 0.6 });
  let differ = 0;
  for (let i = 0; i < still.length; i += 4) if (Math.abs(still[i] - turned[i]) > 8) differ += 1;
  assert.ok(differ > 300, `turning barely changed the face (${differ} pixels)`);
  // What the room has made of it shows as more of its light.
  assert.ok(brightness(at({ exposure: 1.4 }), size, 34, 34) > brightness(at({ exposure: 0.8 }), size, 34, 34), 'a used planet shows no more light than a neglected one');
  // Out of circulation: the colour goes out of it and it dims.
  const warmth = (out) => { const p = (34 * size + 34) * 4; return out[p] / Math.max(1, out[p + 2]); };
  const faded = at({ fade: 1 });
  assert.ok(warmth(faded) < warmth(still) * 0.8, 'a faded planet keeps its colour');
  assert.ok(brightness(faded, size, 34, 34) < brightness(still, size, 34, 34), 'a faded planet is as bright as one in use');
  // Held, with the sun behind it, it still shows its face.
  const backlit = (fill) => brightness(at({ light: [0, 0, -1], fill }), size, size / 2, size / 2);
  assert.ok(backlit(1) > backlit(0) * 2 && backlit(1) > 120, `the planet being read turns to night (${backlit(0)} → ${backlit(1)})`);
});

test('nostromo 3d: a pointer over the map before it has started finds nothing, and does not throw', () => {
  const nostromo = { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) }, nodes: [{ x: 0, y: 0, r: 9, scale: 1 }] };
  const at = new Function('nostromo', `
    ${block('CORE_R')} ${fn('toWorld')} ${fn('nostromoLive')} ${fn('nostromoAt')}
    return nostromoAt;
  `)(nostromo);
  assert.equal(at({ clientX: 10, clientY: 10 }), null);
  // Once the map is running, the same pointer finds what is under it.
  nostromo.cam = { x: 0, y: 0, scale: 1 };
  nostromo.size = { w: 20, h: 20 };
  assert.equal(at({ clientX: 10, clientY: 10 }), nostromo.nodes[0]);
});

// MOTHER's molten body, lifted out the same way.
function magma() {
  return new Function(`
    ${block('ALBEDO_W')} ${block('ALBEDO_H')} ${block('MAGMA_W')} ${block('MAGMA_H')} ${block('LAVA_RAMP')}
    ${block('magmaBuild')} ${block('magmaLimbs')} ${block('sphereTables')} ${block('smooth')} ${block('NOISE_PERM')}
    ${fn('gradientNoise')} ${fn('fractalNoise')} ${fn('cellNoise')} ${fn('lavaColour')} ${fn('magmaMap')} ${fn('sphereTable')} ${fn('shadeMagma')}
    return { magmaMap, sphereTable, shadeMagma };
  `)();
}

test('nostromo 3d: MOTHER is molten rock: dark plates, white-hot cracks, a darker limb, and bursts that light it up', () => {
  const { magmaMap, sphereTable, shadeMagma } = magma();
  // Built a band at a time, and handed out only when whole.
  assert.equal(magmaMap(8), null, 'a half-built map was handed out');
  const map = magmaMap();
  assert.ok(map, 'the map never finished');
  const size = 96;
  const table = sphereTable(size);
  const paint = (options) => shadeMagma(new Uint8ClampedArray(size * size * 4), table, map, { turn: 0.4, flow: 0.3, beat: 0, blasts: [], ...options });
  const face = paint({});
  const glow = (out, x, y) => { const p = (y * size + x) * 4; return out[p] + out[p + 1] + out[p + 2]; };

  // Crust and crack: over the middle of the face, some of it nearly black and some of it alight.
  const middle = [];
  for (let y = 30; y < 66; y += 1) for (let x = 30; x < 66; x += 1) middle.push(glow(face, x, y));
  middle.sort((a, b) => a - b);
  assert.ok(middle[Math.floor(middle.length * 0.2)] < 120, 'there is no dark crust');
  assert.ok(middle[Math.floor(middle.length * 0.97)] > 400, 'there are no white-hot cracks');

  // The limb is darker than the middle, on average, all the way round.
  const ring = (radius) => {
    let sum = 0, n = 0;
    for (let k = 0; k < 64; k += 1) {
      const a = (k / 64) * Math.PI * 2;
      sum += glow(face, Math.round(48 + Math.cos(a) * radius), Math.round(48 + Math.sin(a) * radius)); n += 1;
    }
    return sum / n;
  };
  assert.ok(ring(44) < ring(12), `the limb (${ring(44).toFixed(0)}) is not darker than the middle (${ring(12).toFixed(0)})`);

  // A burst lights the face where it goes off, and the crust turns.
  const burst = paint({ blasts: [{ x: 0, y: 0, z: 1, age: 0.05 }] });
  assert.ok(glow(burst, 48, 48) > glow(face, 48, 48) + 100, 'a burst did not light the face');
  const turned = paint({ turn: 1.2 });
  let differ = 0;
  for (let i = 0; i < face.length; i += 4) if (Math.abs(face[i] - turned[i]) > 20) differ += 1;
  assert.ok(differ > 500, `turning barely moved the crust (${differ} pixels)`);

  // Dragged up or down, the sun turns with the view instead of spinning in place on its own axis;
  // left alone, it is exactly what it was.
  const level = paint({ tilt: 0 });
  assert.deepEqual([...level], [...face], 'no tilt changed the resting face');
  const tilted = paint({ tilt: 0.6 });
  let moved = 0;
  for (let i = 0; i < face.length; i += 4) if (Math.abs(face[i] - tilted[i]) > 20) moved += 1;
  assert.ok(moved > 500, `tilting the view left the crust where it was (${moved} pixels)`);
});

test('nostromo 3d: choosing a dwarf turns it to face you, and the rest falls back while it is held', () => {
  const held = { memory: { id: 7 }, wx: -180, wy: 60, wz: -120, r: 9, x: 0, y: 0 };
  const other = { memory: { id: 8 }, wx: 200, wy: 0, wz: 40, r: 9, x: 0, y: 0 };
  const nostromo = { nodes: [held, other], yaw: 0, pitch: 0, selected: held };
  const run = new Function('nostromo', `
    ${block('VIEW_DISTANCE')} ${block('PITCH_LIMIT')} ${block('FOCUS_TURN')}
    ${fn('focusNostromo')} ${fn('projectNostromo')}
    return { focus: focusNostromo, project: projectNostromo };
  `)(nostromo);
  for (let frame = 0; frame < 240; frame += 1) { run.focus(1, frame / 60); run.project(); }
  assert.ok(Math.abs(held.x) < 2 && Math.abs(held.y) < 2, `it did not come to the line of sight: ${held.x.toFixed(1)}, ${held.y.toFixed(1)}`);
  assert.ok(held.depth > 150, 'it was turned away instead of toward you');
  assert.ok(nostromo.lock.fade > 0.95, 'the rest did not fall back');

  // Letting it go brings the archive back up; the turn stays where it was left.
  const yaw = nostromo.yaw;
  nostromo.selected = null;
  for (let frame = 0; frame < 120; frame += 1) run.focus(1, 4 + frame / 60);
  assert.ok(nostromo.lock.fade < 0.05, 'the veil stayed after the dwarf was let go');
  assert.equal(nostromo.yaw, yaw);

  // A drag while it is held takes the turning back.
  nostromo.selected = other;
  run.focus(1, 10);
  nostromo.lock.aim = false;      // what the drag handler does
  const before = nostromo.yaw;
  run.focus(1, 10.1);
  assert.equal(nostromo.yaw, before, 'the archive kept turning against the human\'s hand');
});

test('nostromo 3d: a forgotten memory implodes, and its links come apart into dust from its end outward', () => {
  const nostromo = {
    nodes: [
      { memory: { id: 1 }, x: 100, y: 0, r: 10, scale: 1, color: '#ffdc3c', rimX: 60, rimY: 0, cx: 80, cy: 10 },
      { memory: { id: 2 }, x: 300, y: 0, r: 10, scale: 1, color: '#3dc6ff' },
      { memory: { id: 3 }, x: 0, y: 300, r: 10, scale: 1, color: '#5cf07a' },
    ],
    links: [{ a: 1, b: 2, weight: 1, cx: 200, cy: 40 }, { a: 2, b: 3, weight: 1 }],
  };
  const calls = [];
  const record = (name) => (...args) => calls.push({ name, args });
  const gradient = () => ({ addColorStop: record('addColorStop') });
  const ctx = new Proxy({ createRadialGradient: () => gradient(), createLinearGradient: () => gradient() }, {
    get: (target, key) => (key in target ? target[key] : record(String(key))),
    set: (target, key, value) => { calls.push({ name: `set:${String(key)}`, args: [value] }); return true; },
  });
  const run = new Function('nostromo', `
    ${block('IMPLOSION')} ${block('DUST_CAP')} ${block('DEBRIS')} ${block('smooth')}
    ${fn('hexAlpha')} ${fn('hexMix')} ${fn('alongCurve')}
    ${fn('implosionScale')} ${fn('wireDust')} ${fn('beginImplosion')} ${fn('drawImplosion')} ${fn('drawDust')}
    return { implosionScale, beginImplosion, drawImplosion, drawDust };
  `)(nostromo);

  // A last breath, then a collapse that accelerates, then nothing.
  assert.ok(run.implosionScale(0.1) > 1, 'there is no last breath');
  assert.ok(run.implosionScale(0.3) > run.implosionScale(0.5) && run.implosionScale(0.5) > run.implosionScale(0.6));
  assert.equal(run.implosionScale(0.7), 0);

  const [gone] = nostromo.nodes;
  run.beginImplosion(gone, 10);
  assert.ok(gone.forgetting, 'the memory did not start going');
  assert.deepEqual(nostromo.links.map((link) => `${link.a}-${link.b}`), ['2-3'], 'its links were not taken, or someone else\'s were');
  assert.equal(nostromo.witness, gone, 'the stage did not stay on it');
  // Its link and its wire from MOTHER both became dust; dust nearer the forgotten end is born first.
  assert.equal(nostromo.fading.length, 2);
  assert.ok(nostromo.dust.length >= 16, `only ${nostromo.dust.length} motes of dust`);
  const towardIt = nostromo.dust.filter((mote) => mote.colour === '#ffdc3c' || Math.hypot(mote.x - gone.x, mote.y - gone.y) < 30);
  const farFromIt = nostromo.dust.filter((mote) => Math.hypot(mote.x - 300, mote.y) < 30);
  assert.ok(towardIt.length && farFromIt.length);
  assert.ok(Math.min(...towardIt.map((m) => m.born)) < Math.min(...farFromIt.map((m) => m.born)), 'the dust does not run outward from the forgotten end');

  // Every frame of it draws without a single bad number.
  for (let step = 0; step <= 30; step += 1) {
    const t = 10 + (step / 30) * 3;
    run.drawImplosion(ctx, gone, t, 0.8, false);
    run.drawDust(ctx, t, 0.8);
  }
  assert.ok(calls.length > 200, 'nothing was drawn');
  for (const call of calls) for (const arg of call.args) {
    if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${call.name} was handed ${arg}`);
    if (typeof arg === 'string') assert.ok(!/NaN|undefined|Infinity/.test(arg), `${call.name} was handed "${arg}"`);
  }
});

// A burst goes off in MOTHER's rock, not on the glass in front of her: it is kept where it went off
// on the body and turns with the crust, which the shading reads at the view's longitude plus the
// turn (shadeMagma). Kept as a point on the screen, it stood still while the body turned under it.
test('nostromo 3d: a burst on MOTHER rides her turn, wherever the view is tipped', () => {
  const nostromo = {};
  const magmaBlasts = new Function('nostromo', `${block('BLAST_EVERY')} ${block('BLAST_LIFE')} ${fn('magmaBlasts')} return magmaBlasts;`)(nostromo);
  const crust = (b, tilt) => Math.atan2(b.x, b.z * Math.cos(tilt) - b.y * Math.sin(tilt));
  const random = Math.random;
  try {
    for (const tilt of [0, 0.35, -0.5]) {
      nostromo.blasts = [];
      Math.random = () => 0;          // one is born, at the first place it can be
      const [born] = magmaBlasts(10, { turn: 1.2, tilt });
      Math.random = () => 0.999;      // and no other after it
      const [later] = magmaBlasts(11, { turn: 1.5, tilt });
      assert.ok(born && later, 'the burst is gone before its life is over');
      assert.ok(Math.hypot(later.x - born.x, later.y - born.y, later.z - born.z) > 0.05, 'the burst stayed put on the screen while the body turned');
      const drift = Math.abs((crust(later, tilt) + 1.5) - (crust(born, tilt) + 1.2));
      assert.ok(drift < 1e-9, `the burst slid over the crust by ${drift} rad`);
      assert.ok(Math.abs(Math.hypot(later.x, later.y, later.z) - 1) < 1e-9, 'the burst left the surface');
    }
  } finally {
    Math.random = random;
  }
  // A fifth smaller than before, by one factor for every memory: they stay in proportion.
  assert.match(source, /const MEMORY_SCALE = 0\.64;/);
});

// On a phone NOSTROMO is a chart drawn on demand, not a body turned sixty times a second.
test('nostromo on a phone: a chart that is drawn when something changes, with the zone said in words', () => {
  assert.match(source, /if \(state\.device\) \{ flatNostromo\(\); window\.addEventListener\('resize', flatResize\); return; \}/);
  assert.doesNotMatch(source, /stillNostromo|paintStillNostromo/, 'the still picture of the brain is back');
  assert.match(fn('flatPaint'), /requestAnimationFrame\(\(\) => \{ flat\.queued = 0; drawFlat\(\); \}\)/);
  // Dots keep their proportion: one size for the largest, the rest by their radius against it.
  assert.match(fn('flatLayout'), /node\.dot = flat\.dot \* \(\(node\.r3 \?\? node\.r\) \/ top\);/);
  assert.match(fn('flatTouch'), /flat\.touches\.size === 2/, 'two fingers no longer zoom');
  // The card says where a memory stands, and what that means, without a tooltip.
  assert.match(fn('showNostromoCard'), /el\('b', 'zone-word', zoneWord\(standing\)\), el\('span', 'zone-note', ZONE_NOTE\[standing\] \?\? ''\)/);
});

// Each planet turns about its own leaning axis, its own way and slowly (2026-11-19, the author:
// «rotación sobre su propio eje de forma aleatoria y en diferentes velocidades, que no sean tan rápidas»).
test('nostromo 3d: every planet leans its own way, turns its own sense, and takes 50 to 140 seconds a turn', () => {
  const { globeTable } = shader();
  const flat = globeTable(40, 1, 0);
  const leaning = globeTable(40, 1, 0.26);
  // The same pixel reads another place on the body when the axis leans.
  let differs = 0;
  for (let i = 0; i < flat.disc.length; i += 13) if (Math.abs(flat.disc[i + 5] - leaning.disc[i + 5]) > 0.5) differs += 1;
  assert.ok(differs > 50, `a leaning axis reads the same map rows: ${differs}`);
  assert.equal(flat.disc.length % 13, 0, 'a globe cell is 13 numbers: east has its height too');
  assert.match(source, /tilt: PLANET_TILTS\[Math\.floor\(Math\.random\(\) \* PLANET_TILTS\.length\)\], sense: Math\.random\(\) < 0\.5 \? -1 : 1, period: 50 \+ Math\.random\(\) \* 90/);
  assert.match(source, /node\.axisAge = \(node\.axisAge \?\? 0\) \+ dt \/ 60;/, 'the turn does not run on seconds');
});
