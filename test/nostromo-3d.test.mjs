import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// NOSTROMO is a body in space now. The physics runs in three dimensions and each frame is turned
// and projected onto the screen. Both halves are lifted out of the shipped client and run here.
const source = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
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
  assert.match(handler, /nostromo\.yaw = \(nostromo\.yaw \?\? 0\) \+ dx \* TURN_PER_PIXEL/, 'a drag does not turn the body');
  assert.match(handler, /Math\.max\(-PITCH_LIMIT, Math\.min\(PITCH_LIMIT/, 'the head can be tipped over');
  assert.match(source, /drag\.pan = event\.shiftKey/);
  // RECENTER brings back the side view as well as the camera.
  assert.match(source, /#nostromo-recenter'\)\?\.addEventListener\('click', \(event\) => \{[^}]*nostromo\.yaw = 0; nostromo\.pitch = 0;/);
  const page = await readFile(join(import.meta.dirname, '..', 'public', 'index.html'), 'utf8');
  assert.match(page, /DRAG TO TURN · SHIFT\+DRAG TO MOVE/, 'the help line still says dragging moves');
});

// The dwarf shader, lifted out and run on its own: a table, a surface map and a star in, pixels out.
function shader() {
  return new Function(`
    ${block('ALBEDO_W')} ${block('ALBEDO_H')} ${block('LIMB_DARKENING')} ${block('STAR_TRAITS')} ${block('SUN_TRAITS')}
    ${block('SURFACE_BY_ZONE')} ${block('COLD_GRANULES')} ${block('COLD_GLOW')} ${block('COLD_WHITE')} ${fn('surfaceOf')}
    ${block('dwarfAlbedos')} ${block('sphereTables')} ${block('smooth')}
    ${block('NOISE_PERM')} ${fn('gradientNoise')} ${fn('fractalNoise')} ${fn('cellNoise')} ${fn('dwarfAlbedo')} ${fn('sphereTable')} ${fn('shadeDwarf')}
    return { dwarfAlbedo, sphereTable, shadeDwarf, surfaceOf, STAR_TRAITS };
  `)();
}
const brightness = (out, size, x, y) => { const p = (y * size + x) * 4; return out[p] + out[p + 1] + out[p + 2]; };
const YELLOW = [1, 220 / 255, 60 / 255];
// A surface with nothing on it, so what is read is the star and not its weather.
const plainMap = (length) => { const map = new Float32Array(length); for (let i = 0; i < length; i += 2) map[i] = 0.5; return map; };

test('nostromo 3d: a dwarf lights itself: brightest in the middle, darker and warmer at the limb, the same all round', () => {
  const { dwarfAlbedo, sphereTable, shadeDwarf, STAR_TRAITS } = shader();
  const size = 64;
  const table = sphereTable(size);
  const map = plainMap(dwarfAlbedo('decision').length);
  const out = shadeDwarf(new Uint8ClampedArray(size * size * 4), table, map, { colour: YELLOW, traits: STAR_TRAITS.decision, turn: 0, burn: 0.5 });
  const centre = brightness(out, size, 32, 32);
  const limb = brightness(out, size, 3, 32);
  assert.ok(centre > limb * 1.3, `the limb is not darker than the middle (centre ${centre}, limb ${limb})`);
  // Blue dims most at the limb, so the edge is warmer: more red for its blue than the middle has.
  const warmth = (x, y) => { const p = (y * size + x) * 4; return out[p] / Math.max(1, out[p + 2]); };
  assert.ok(warmth(3, 32) > warmth(32, 32), 'the limb is not warmer than the middle');
  // No side is lit: opposite edges, and opposite halves, read the same.
  for (const [a, b] of [[[3, 32], [60, 32]], [[32, 3], [32, 60]]]) {
    const one = brightness(out, size, ...a);
    const other = brightness(out, size, ...b);
    assert.ok(Math.abs(one - other) <= 6, `one edge is lit and the other is not (${one} against ${other})`);
  }
  // Outside the disc is clear, and the edge is softened rather than cut.
  assert.equal(out[3], 0, 'a corner outside the body was painted');
  const alphas = new Set();
  for (let i = 3; i < out.length; i += 4) alphas.add(out[i]);
  assert.ok([...alphas].some((value) => value > 0 && value < 255), 'the rim is not antialiased');
});

test('nostromo 3d: a dwarf boils, turns, carries spots, and burns brighter the more the room has made of it', () => {
  const { dwarfAlbedo, sphereTable, shadeDwarf, STAR_TRAITS } = shader();
  const size = 96;
  const table = sphereTable(size);
  const map = dwarfAlbedo('decision');
  const at = (turn, burn) => shadeDwarf(new Uint8ClampedArray(size * size * 4), table, map, { colour: YELLOW, traits: STAR_TRAITS.decision, turn, burn });

  // Granulation: the middle of the face is not one flat value.
  const still = at(0, 0.5);
  const middle = [];
  for (let y = 40; y < 56; y += 1) for (let x = 40; x < 56; x += 1) middle.push(brightness(still, size, x, y));
  const mean = middle.reduce((sum, value) => sum + value, 0) / middle.length;
  const spread = Math.sqrt(middle.reduce((sum, value) => sum + (value - mean) ** 2, 0) / middle.length);
  assert.ok(spread > 4, `the surface is flat: a spread of ${spread.toFixed(1)} across the middle`);

  // Turning moves the face.
  const turned = at(0.6, 0.5);
  let differ = 0;
  for (let i = 0; i < still.length; i += 4) if (Math.abs(still[i] - turned[i]) > 8) differ += 1;
  assert.ok(differ > 300, `turning barely changed the face (${differ} pixels)`);

  // Burning harder is brighter, everywhere on the face.
  const dim = at(0, 0.05);
  const hot = at(0, 1);
  assert.ok(brightness(hot, size, 48, 48) > brightness(dim, size, 48, 48), 'a dwarf the room leans on does not outshine one it ignores');

  // Every map is built once per class, and each class has a surface of its own.
  assert.equal(dwarfAlbedo('decision'), map);
  assert.notDeepEqual(dwarfAlbedo('fact').slice(0, 64), map.slice(0, 64), 'two classes share one surface');
});

test('nostromo 3d: the surface follows the memory: clean when confirmed, blotched when held as false, quiet when cold', () => {
  const { dwarfAlbedo, sphereTable, shadeDwarf, surfaceOf, STAR_TRAITS } = shader();
  // What each standing asks of the surface.
  const sun = STAR_TRAITS.decision;
  assert.equal(surfaceOf({ zone: 'bridge' }, sun).spots, 0, 'a confirmed memory still carries spots');
  assert.equal(surfaceOf({ zone: 'hold' }, sun).spots, sun.spots, 'an unjudged memory lost its class\'s spots');
  assert.equal(surfaceOf({ zone: 'hold' }, STAR_TRAITS.fact).spots, 0, 'an unjudged white dwarf was spotted');
  assert.ok(surfaceOf({ zone: 'medbay' }, STAR_TRAITS.fact).spots > 0, 'a white dwarf held as false is clean');
  assert.ok(surfaceOf({ zone: 'jettisoned' }, sun).reach < surfaceOf({ zone: 'medbay' }, sun).reach, 'out of circulation is not the worst');
  assert.ok(surfaceOf({ zone: 'hold' }, sun, true).granules < surfaceOf({ zone: 'hold' }, sun).granules, 'a cold memory still boils');

  // A cold dwarf is a cooling one: dimmer, and no longer white-hot in the middle.
  {
    const size = 48;
    const table = sphereTable(size);
    const map = plainMap(dwarfAlbedo('decision').length);
    const paint = (cold) => shadeDwarf(new Uint8ClampedArray(size * size * 4), table, map, { colour: YELLOW, traits: sun, surface: surfaceOf({ zone: 'hold' }, sun, cold), turn: 0, burn: 0.6 });
    const warm = paint(false);
    const cooling = paint(true);
    assert.ok(brightness(cooling, size, 24, 24) < brightness(warm, size, 24, 24) * 0.85, 'a cold dwarf burns as bright as a used one');
    // White-hot is blue catching up with red; cooling, the middle keeps less of its blue.
    const blueShare = (out) => out[(24 * size + 24) * 4 + 2] / Math.max(1, out[(24 * size + 24) * 4]);
    assert.ok(blueShare(cooling) < blueShare(warm), 'a cold dwarf is still white-hot in the middle');
  }
  assert.deepEqual(surfaceOf({}, sun), surfaceOf({ zone: 'hold' }, sun), 'a memory with no zone is not read as unjudged');

  // And what it looks like: the darkened part of the face, over a whole turn of the body.
  const size = 80;
  const table = sphereTable(size);
  const map = dwarfAlbedo('decision');
  const plain = plainMap(map.length);
  const spotted = (zone) => {
    let dark = 0;
    for (let step = 0; step < 8; step += 1) {
      const turn = (step / 8) * Math.PI * 2;
      const surface = surfaceOf({ zone }, sun);
      const face = shadeDwarf(new Uint8ClampedArray(size * size * 4), table, map, { colour: YELLOW, traits: sun, surface: { ...surface, granules: 0 }, turn, burn: 0.5 });
      const bare = shadeDwarf(new Uint8ClampedArray(size * size * 4), table, plain, { colour: YELLOW, traits: sun, surface: { ...surface, granules: 0, faculae: 0 }, turn, burn: 0.5 });
      for (let i = 0; i < face.length; i += 4) if (bare[i + 3] === 255 && face[i] + face[i + 1] < 0.75 * (bare[i] + bare[i + 1])) dark += 1;
    }
    return dark;
  };
  const [bridge, hold, medbay, jettisoned] = ['bridge', 'hold', 'medbay', 'jettisoned'].map(spotted);
  assert.equal(bridge, 0, `a confirmed memory showed ${bridge} spotted pixels`);
  assert.ok(hold > 0, 'an unjudged sun shows no spots over a whole turn');
  assert.ok(medbay > hold * 2, `held as false (${medbay}) is not far more blotched than unjudged (${hold})`);
  assert.ok(jettisoned > medbay, `out of circulation (${jettisoned}) is not the most blotched (${medbay})`);
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
