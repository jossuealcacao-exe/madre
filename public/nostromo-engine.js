// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// NOSTROMO's engine: the physics and the painters of the archive as a body in space, lifted out
// of the room's page so the Macroverso can draw every room the way its own NOSTROMO is drawn —
// with these very functions, not a copy of them (docs/MACROVERSO.md, phase 3a).
//
// What is shared lives at the top of the file: constants, pure maths, and the textures a star of
// a class is built from once and worn by every memory of that class in every scene. What belongs
// to one scene — the bodies, the camera, the pulses, the painted face of MOTHER, the budget of
// faces painted this frame — lives on the scene object `createNostromo` is handed, and the
// functions it returns close over it. That object keeps the name `nostromo` inside, because the
// functions were written against it and read exactly as they always did.
//
// The engine never touches the room's page. The three things the drawing needs from it — words in
// the room's language, how much of the canvas the open card covers, what to shake when CODE000
// lands — are hooks on the scene (`words`, `covered`, `onClang`), and each has a default.

// Each kind of memory has its colour: a decision yellow, a fact white, a preference green, a
// question blue, a doubtful memory violet. The wires, the pulses and every chip outside the map wear
// it; on the map itself each kind is a planet that looks like it (PLANETS, below). One palette for the
// room, the Macroverso and the stylesheet (`--mem-*`): a test keeps them the same.
export const MEMORY_COLORS = { decision: '#ffdc3c', fact: '#dfeeff', preference: '#5cf07a', question: '#3dc6ff', aberration: '#b14cff' };
// What a zone changes on the map is whether the star is lit: only what still travels into turns
// burns. The rule is the archive's (`travels()` in src/memory.mjs); this is the client's copy.
export const UNDERWAY = new Set(['hold', 'bridge']);
export const travels = (memory) => UNDERWAY.has(memory?.zone ?? 'hold');

// One kind is not a star. An aberration is a claim the room established is false, and it burns
// nothing: it is a collapsed body with a ring of what fell into it, and it gives off no light
// of its own. It is drawn dark on purpose, because it is the one thing in here nobody should
// read as knowledge.
export const COLLAPSED = 'aberration';
// The field of dust and stars a void sits in. Laid out once and shared: every aberration wears
// the same field turned to its own angle, so a hundred of them cost one table.
export const VOID_DUST = Array.from({ length: 64 }, (_, i) => {
  const spiral = i * 2.39996;                                  // golden angle: no clumps, no rows
  const out = Math.sqrt((i + 0.6) / 64);                       // even by area, so it does not crowd the middle
  const warm = i % 9 === 0;
  return {
    angle: spiral,
    out,
    size: 0.5 + ((i * 7919) % 100) / 100 * 1.5,
    rate: 0.6 + ((i * 6151) % 100) / 100 * 1.9,
    phase: ((i * 4133) % 100) / 100 * Math.PI * 2,
    colour: warm ? '255, 226, 168' : ((i % 4) ? '226, 238, 255' : '176, 204, 255'),
  };
});

// How alive a memory is: how often the room has actually recalled it, how recently, and how
// woven it is into the rest.
// HOW MUCH A MEMORY KNOWS (2026-10-28): the more it holds, the bigger its planet or its neuron. What
// it says (its words, or their count from a far room), the sources it cites and how much of the
// conversation it distils. Read against the richest memory of the same archive, so the difference
// shows in a young archive and in an old one; a floor keeps a small archive from drawing giants, and
// the biggest stays the size the map always allowed (no body so big it looks wrong).
export function knowledgeOf(memory) {
  const words = Number.isFinite(memory?.words) ? memory.words : (typeof memory?.text === 'string' ? (memory.text.match(/\S+/g) ?? []).length : 0);
  const span = Math.max(1, (memory?.throughSequence ?? 0) - (memory?.fromSequence ?? 0));
  const cited = memory?.sources?.length ?? memory?.sourcesCount ?? 0;
  // A far room sends how many sources a memory cites, not the list of them.
  return Math.log2(1 + words / 12) + 0.8 * Math.log2(1 + span) + 0.6 * Math.min(cited, 8);
}
export const BODY_SMALL = 5.5;
export const BODY_BIG = 18;
export function bodyOf(known, richest) {
  const share = Math.min(1, known / Math.max(richest, 6));
  return BODY_SMALL + (BODY_BIG - BODY_SMALL) * share ** 0.85;
}

export function rawActivity(memory, degree = 0) {
  const use = 1 - Math.exp(-Number(memory.recalled ?? 0) / 4);
  const since = memory.lastRecalled ? (Date.now() - Date.parse(memory.lastRecalled)) / 86400000 : null;
  const fresh = since === null || Number.isNaN(since) ? 0 : Math.exp(-Math.max(0, since) / 3);
  const woven = Math.min(1, degree / 4);
  return 0.55 * use + 0.3 * fresh + 0.15 * woven;
}

// The constellation is read against itself: the busiest memory is the brightest and the rest
// scale beneath it, so the network has contrast in a young archive and in an old one. Before
// the room has recalled anything, how woven a memory is carries the picture; the moment turns
// start reaching for memories, use takes over. The card always reports the true counts.
export function activityOf(raw, top) {
  return top > 0 ? Math.max(0.08, Math.min(1, 0.08 + 0.92 * (raw / top))) : 0.08;
}

// World space: MOTHER's core sits at (0, 0); planets orbit in world units and a
// camera maps the world to the canvas. The camera follows the whole system
// until the human takes the wheel (drag, wheel), and RECENTER hands it back.
// 360 (was 300): the memories stand further out, so each one reads on its own and the
// constellation takes the canvas it has.
export const NOSTROMO_ORBIT = 360;

// The archive is not a ball. It is the shape of the thing that holds it, seen from the side:
// a brain, facing left. One function says how far the shell is at a given bearing, and BOTH the
// first placement and the force that holds the system use it — which is the whole trick. The
// ring force used to pull every memory onto a circle, so any shape given at placement was undone
// within a second or two of physics. Shape the target and the shape is what the system settles
// into instead of what it drifts away from.
//
// Bearings are canvas bearings: 0 points right (occipital, the back of the head), PI/2 points
// DOWN (temporal lobe and cerebellum), PI points left (frontal pole), 3PI/2 points up (parietal,
// the crown).
function brainRadius(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // Wider than tall, which is what stops it reading as a circle before anything else is added.
  let r = 1 / Math.hypot(cos / 1.0, sin / 0.78);
  // The frontal pole is blunt and sits a little forward of a pure ellipse.
  r += 0.07 * Math.max(0, -cos) ** 2;
  // The base is flat: a brain rests on something. Everything below the midline comes in, most
  // of all straight down.
  r -= 0.13 * Math.max(0, sin) ** 1.6;
  // The temporal lobe hangs at the lower front, separated from the frontal lobe above it.
  r += 0.09 * Math.exp(-(((a - 2.45) / 0.42) ** 2));
  // And the cerebellum is its own smaller mass at the lower back.
  r += 0.12 * Math.exp(-(((a - 0.95) / 0.34) ** 2));
  return r;
}

// The longitudinal fissure, the groove that makes two hemispheres out of one mass. It runs
// front to back down the middle, so it lies in depth: invisible from the side, plain the moment
// the brain is turned to face you. A density gap rather than a wall, half as wide as this, in
// orbit units: memories are nudged out of it and never across it.
const FISSURE = 0.07;

// ---- The third dimension.
//
// The archive is a body, not a drawing of one. Every memory lives at (wx, wy, wz): the outline
// above is the brain seen from the side, and BRAIN_WIDTH says how far it reaches toward each
// temple. The physics runs there. Each frame the whole body is turned by the human's hand and
// projected, and the projection is written into x and y, so everything that draws, links,
// sends pulses or answers a click keeps working on the screen it always worked on.
const BRAIN_WIDTH = 0.84;      // ear to ear, against front to back
const VIEW_DISTANCE = 1500;    // world units from the eye to MOTHER: enough to read depth, not to distort
export const PITCH_LIMIT = 1.1;       // how far a held memory tips the head to face you
// Your hand turns it any way (2026-10-27): over the top and under, all the way round. Past the
// pole the body is upside down, so a sideways drag turns it the other way to keep following the hand.
export const turnBy = (yaw, pitch, dx, dy) => {
  const upright = Math.cos(pitch) >= 0 ? 1 : -1;
  const next = pitch + dy * TURN_PER_PIXEL;
  return { yaw: yaw + dx * TURN_PER_PIXEL * upright, pitch: Math.atan2(Math.sin(next), Math.cos(next)) };
};
export const TURN_PER_PIXEL = 0.008;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
// How deep under the surface a memory sits. Thin, on purpose: a thick shell fills the outline in
// and the brain becomes a disc; a thin one leaves the silhouette to the memories along its edge.
const shellDepth = (node) => 1.12 + node.distance * 0.18;
const frac = (value) => value - Math.floor(value);

// ---- Forgetting.
//
// A memory that is forgotten is not switched off: the universe takes it. It swells once, a last
// breath; a horizon opens where it was, light bending round its rim; what it was made of falls
// in, spiralling faster the closer it gets and drawn out into threads; the body collapses, there
// is one point of light as it goes, and a faint ring runs out into the dark and is gone. Its
// links do not snap. They come apart into dust, from its end outward like a wave, and the dust
// drifts off into the field, glinting, and goes out. Aberrations go the same way.
const IMPLOSION = 2.4;          // seconds, from the last breath to nothing
const DUST_CAP = 1400;          // a ceiling, so forgetting a hub does not cost a frame
const DEBRIS = 40;

// How big the body still is, 0..1 of the way through: a swell, then a collapse that accelerates.
function implosionScale(p) {
  if (p < 0.12) return 1 + 0.22 * Math.sin((p / 0.12) * (Math.PI / 2));
  if (p < 0.62) return 1.22 * (1 - ((p - 0.12) / 0.5) ** 2.2);
  return 0;
}

// Points along a wire, as the curve it is drawn with, with where along it each one is.
function wireDust(x0, y0, cx, cy, x1, y1, from, to, born, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const u = (i + Math.random()) / count;
    const at = alongCurve(x0, y0, cx, cy, x1, y1, u);
    const drift = 0.25 + Math.random() * 0.55;
    const heading = Math.random() * Math.PI * 2;
    out.push({
      x: at.x, y: at.y, vx: Math.cos(heading) * drift, vy: Math.sin(heading) * drift,
      // The wave runs from the forgotten end outward: dust is born where it has reached.
      born: born + 0.15 + 0.55 * u, life: 1.4 + Math.random() * 1.8,
      size: 0.6 + Math.random() * 1.3, colour: hexMix(from, to, u), phase: Math.random() * 6.3,
    });
  }
  return out;
}

// ---- The sight.
//
// What marks a dwarf under the pointer and a dwarf that has been chosen: a gunsight, the way a
// fighter's head-up display draws one. Four corner brackets that close in on the target when it
// is chosen, a broken ring turning around it, range ticks at the four bearings and the lock
// written beside it. The pointer gets the brackets only, dimmer: a sight that is looking, not
// one that has locked. Drawn in the world but sized in screen pixels, so it reads the same at
// every zoom.
const HUD_GREEN = '57, 255, 110';

// ---- Focus.
//
// Choosing a dwarf turns the archive in the hand until that dwarf faces you, brings the camera
// to it and lets everything else fall back into the dark, so the one being read is the one that
// is seen. Dragging while it is held hands the turning back to the human; letting it go brings
// the rest of the archive back up.
const FOCUS_TURN = 0.07;      // how much of the remaining turn is taken each frame
export const FOCUS_VEIL = 0.7;       // how far everything else falls back

const HEART_PERIOD = 1.15;   // seconds per beat: slow, deliberate, alive
const WAVE_SPEED = 260;      // world units per second a beat travels outward

// The core's radius in world units: constant so the layout does not depend on the window.
// 114: ten per cent larger than the 104 it was (2026-10-09), asked for so MOTHER reads first.
export const CORE_R = 114;

// ---- The shape of MOTHER's body.
// The axis leans, so we look a little down on the planet rather than straight at its equator:
// without the lean a turning sphere reads as a turning disc. The sun is fixed in view space,
// which is what lets the body turn under it.
const CORE_TILT = 0.42;
// A star lights itself, so nothing here decides which side is day. This direction only tells
// the surface features how much of their own glare faces us.
const CORE_LIGHT = { x: -0.5, y: -0.46, z: 0.73 };

// ---- The photosphere.
// Granulation is built once into a strip that repeats left to right, then wrapped round the
// body: turning the star is moving the window along the strip, so the texture costs nothing to
// animate. The strip is drawn in rows, each row cut into pieces so longitude runs as a sphere's
// does and the cells narrow toward the limb instead of smearing along it.
const GRAIN_ROWS = 30;
const GRAIN_PIECES = 5;
let grainCanvas;
function granuleTexture() {
  if (grainCanvas !== undefined) return grainCanvas;
  grainCanvas = null;
  try {
    const width = 640;
    const height = 320;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height;
    const paint = canvas.getContext('2d');
    if (!paint) return grainCanvas;
    // A dark ground. What makes a star frightening is not how bright it is but how much of it
    // is nearly out: the molten matter has to burn against something almost black.
    paint.fillStyle = '#5e1305';
    paint.fillRect(0, 0, width * 2, height);
    // Boiling cells: hot ones with a bright middle, cool lanes between them. Every cell is laid
    // down twice, a strip apart, so any window of one strip's width joins itself seamlessly.
    const cell = (x, y, size, warm) => {
      for (const at of [x - width, x, x + width]) {
        const skin = paint.createRadialGradient(at, y, 0, at, y, size);
        if (warm > 0.78) {
          // The few that are truly alight, and they are what the eye goes to.
          skin.addColorStop(0, `rgba(255, ${186 + Math.round(warm * 58)}, ${88 + Math.round(warm * 96)}, ${0.5 + warm * 0.45})`);
          skin.addColorStop(0.5, `rgba(255, 110, 26, ${0.22 + warm * 0.22})`);
        } else if (warm > 0.5) {
          skin.addColorStop(0, `rgba(${196 + Math.round(warm * 40)}, ${58 + Math.round(warm * 40)}, 12, ${0.24 + warm * 0.2})`);
          skin.addColorStop(0.5, `rgba(168, 44, 10, 0.12)`);
        } else {
          // Cool crust, and most of the surface is this.
          skin.addColorStop(0, `rgba(${44 + Math.round(warm * 58)}, ${6 + Math.round(warm * 16)}, 4, ${0.46 + (0.5 - warm) * 0.5})`);
          skin.addColorStop(0.55, `rgba(60, 12, 4, ${0.2})`);
        }
        skin.addColorStop(1, 'rgba(120, 30, 10, 0)');
        paint.fillStyle = skin;
        paint.beginPath(); paint.arc(at, y, size, 0, Math.PI * 2); paint.fill();
      }
    };
    for (let i = 0; i < 1400; i += 1) cell(Math.random() * width, Math.random() * height, 9 + Math.random() * 16, Math.random());
    for (let i = 0; i < 3600; i += 1) cell(Math.random() * width, Math.random() * height, 2.5 + Math.random() * 5.5, Math.random());
    grainCanvas = canvas;
  } catch {
    grainCanvas = null;   // no canvas to draw into: the star keeps its gradient and loses its grain
  }
  return grainCanvas;
}
// A great circle is walked in fixed steps, so the sine and cosine of those steps are worked
// out once and read from a table for every band, every frame.
const CIRCLE_STEPS = 44;
const CIRCLE_COS = Array.from({ length: CIRCLE_STEPS + 1 }, (_, k) => Math.cos((k / CIRCLE_STEPS) * Math.PI * 2));
const CIRCLE_SIN = Array.from({ length: CIRCLE_STEPS + 1 }, (_, k) => Math.sin((k / CIRCLE_STEPS) * Math.PI * 2));

// ---- The memories are planets (2026-11-15, asked by the author: «planetas en memorias deben verse
// hiperrealistas, iluminados y sombreados por el sol, … 4 tipos de planetas en colores tipo Mercurio,
// Urano, Tierra y Marte»).
//
// A memory used to be a dwarf star that made its own light. It is a planet now, and a planet gives
// none: the sun at the centre of the map lights it from where it stands. The side turned to the sun
// is day; the far side is night, almost black, with only a little light from everything else; the
// line between them, the terminator, moves as the planet goes round its orbit or as the map is
// turned, because the direction of the sun is worked out again from where the planet is each time
// its face is painted.
//
// Each kind of memory is one planet, chosen for looking like the colour that kind has always had:
//   a fact is Mercury: grey rock, cratered all over, no air; a few young craters throw bright rays;
//   a decision is Mars: rust and butterscotch, darker basalt plains, a canyon, a white polar cap;
//   a preference is the Earth: oceans, continents, deserts, ice, clouds that drift a little faster
//     than the ground, a blue atmosphere, and the sun's glint on the water;
//   a question is Uranus: pale cyan and smooth, with bands too faint to name and a haze at its edge.
// All of it is grown here from noise: no picture of a planet is used and nothing is downloaded.
//
// What makes them read as real is how the light falls. The rocky two are lit as the Moon is (a
// blend of Lommel–Seeliger and Lambert): even across the day side, then falling off hard at the
// terminator, their relief raised by the light that grazes it. The two with air are lit softly,
// darker toward the limb, and wear a halo of atmosphere on the side the sun is on, all the way
// round when the sun is behind them. The colours are lit in linear light and brought back for the
// screen, so the terminator fades the way it does in a photograph instead of as a grey band.
//
// `base` is the planet's colour at a glance, for wherever there is no face to paint yet; `bump` how
// far its relief tilts the light; `wrap` how far its air carries light past the terminator; `limb`
// how much it darkens toward the edge; `air` the colour of its atmosphere and `airGlow` how bright
// its halo is, `thickness` how far it reaches past the limb; `face` the turn the legend shows it at.
export const PLANETS = {
  fact: { name: 'mercury', base: '#8f8a84', rocky: true, bump: 0.075, wrap: 0, limb: 0, air: null, airGlow: 0, thickness: 0, face: 0.6 },
  decision: { name: 'mars', base: '#b8683c', rocky: true, bump: 0.035, wrap: 0, limb: 0, air: [1, 0.72, 0.52], airGlow: 0.3, thickness: 0.022, face: 2.1 },
  preference: { name: 'earth', base: '#2f5f8f', rocky: false, bump: 0.03, wrap: 0.05, limb: 0.12, air: [0.36, 0.6, 1], airGlow: 0.95, thickness: 0.035, ocean: true, clouds: true, face: 4.4 },
  question: { name: 'uranus', base: '#a2d6de', rocky: false, bump: 0, wrap: 0.07, limb: 0.42, air: [0.66, 0.9, 1], airGlow: 0.55, thickness: 0.032, face: 0 },
};
// A kind the map does not know is drawn as a fact, as its colour always was.
export const planetOf = (kind) => (PLANETS[kind] ? kind : 'fact');
// How far past its disc a planet's painted face reaches, for the halo of its air.
const PLANET_HALO = 1.16;
// The sun at the centre is a little warm of white, and so is the light it gives.
const SUN_LIGHT = [1, 0.95, 0.88];
// What reaches the night side from everything that is not the sun: almost nothing.
const PLANET_AMBIENT = 0.04;

// The surface of each planet is a map of the whole body in latitude and longitude, built once per
// kind from noise sampled on the sphere itself, so it has no seam and nothing stretches at the
// poles; turning the body is sliding along it.
const ALBEDO_W = 256;
const ALBEDO_H = 128;
const sphereTables = new Map();


// Gradient noise, the improved kind: continuous in every direction, with no grid showing
// through it the way value noise shows its cells. The permutation is fixed, so every room grows
// the same surfaces.
const NOISE_PERM = (() => {
  const order = Array.from({ length: 256 }, (_, i) => i);
  let seed = 1013;
  for (let i = 255; i > 0; i -= 1) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Uint8Array.from([...order, ...order]);
})();
export function gradientNoise(x, y, z) {
  const P = NOISE_PERM;
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const u = fade(x), v = fade(y), w = fade(z);
  const grad = (hash, gx, gy, gz) => {
    const h = hash & 15;
    const a = h < 8 ? gx : gy;
    const b = h < 4 ? gy : h === 12 || h === 14 ? gx : gz;
    return ((h & 1) ? -a : a) + ((h & 2) ? -b : b);
  };
  const lerp = (t, a, b) => a + t * (b - a);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(w,
    lerp(v, lerp(u, grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z)), lerp(u, grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z))),
    lerp(v, lerp(u, grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1)), lerp(u, grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1))));
}
// Octaves of it, folded into 0..1.
export function fractalNoise(x, y, z, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i += 1) { sum += amp * gradientNoise(x * freq, y * freq, z * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, (sum / norm) * 1.6));
}
// Cellular noise: the distance to the nearest and the second nearest of a scatter of points,
// one jittered into each unit cell. Where the two are nearly equal is the border between two
// cells, which is exactly the shape of a granule's dark lane.
export function cellNoise(x, y, z) {
  const P = NOISE_PERM;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let near = 9, next = 9;
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const h = P[(P[(P[(xi + dx) & 255] + ((yi + dy) & 255)) & 255] + ((zi + dz) & 255)) & 255];
    const ox = xi + dx + P[h] / 255 - x;
    const oy = yi + dy + P[(h + 85) & 255] / 255 - y;
    const oz = zi + dz + P[(h + 170) & 255] / 255 - z;
    const d = ox * ox + oy * oy + oz * oz;
    if (d < near) { next = near; near = d; } else if (d < next) next = d;
  }
  return [Math.sqrt(near), Math.sqrt(next)];
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const sunClamp = (value, low, high) => Math.min(high, Math.max(low, value));
// ---- The sun at the centre of the projects (2026-11-10, asked by the author: «the sun does not feel
// like a real sun»). The Coordinator in the planets view is a star now, and so is the centre of every project's map (2026-11-10: «the sun in the projects does not look like the Coordinator's»), drawn as the Sun is seen in a
// white-light photograph, from the same noise the memories' planets are made of (this file):
//   granulation — bright cells of rising gas and dark lanes between them, over a slow unevenness;
//   spots — a dark umbra in a paler penumbra, a few, drifting with the turn;
//   limb darkening — brightest in the middle, dimmer and warmer toward the edge, more in blue than
//     in red, which is what makes a disc of light read as a ball;
//   round it — a tight bright skin at the limb and a wide warm glow, no rays.
// The surface is a map of the whole body in latitude and longitude, built once; turning is sliding
// along it. Painted at `side` pixels (SUN_SIDE in Home, more on a map seen up close) and scaled.
const SUN_SIDE = 192;
const SUN_W = 256;
const SUN_H = 128;
// How much each channel dims at the limb, red to blue.
const SUN_LIMB = [0.42, 0.62, 0.86];
// The photosphere's own colour, a little warm of white.
const SUN_TONE = [255, 236, 196];
export function sunOrb({ side = SUN_SIDE } = {}) {
  // The surface keeps about two of its texels to each pixel across the face, whatever the size.
  const W = Math.min(1024, Math.max(SUN_W, side * 2));
  const H = W / 2;
  const map = new Float32Array(W * H);
  // A few spots, each a latitude, a longitude and a size, in the bands spots keep to.
  const spots = [[0.28, 0.6, 0.07], [0.22, 0.9, 0.045], [-0.3, 2.4, 0.06], [-0.24, 2.62, 0.035], [0.18, 4.1, 0.05], [-0.2, 5.3, 0.04]];
  for (let row = 0; row < H; row += 1) {
    const lat = ((row + 0.5) / H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let col = 0; col < W; col += 1) {
      const lon = ((col + 0.5) / W) * Math.PI * 2;
      const x = cl * Math.cos(lon), y = sl, z = cl * Math.sin(lon);
      const [near, next] = cellNoise(x * 14 + 3, y * 14, z * 14);
      const lanes = smooth(0.02, 0.22, next - near);
      const drift = fractalNoise(x * 2.4 + 9, y * 2.4, z * 2.4, 4);
      let bright = 0.7 + 0.28 * lanes + 0.2 * (drift - 0.5);
      for (const [sLat, sLon, size] of spots) {
        const d = Math.acos(sunClamp(Math.sin(sLat) * sl + Math.cos(sLat) * cl * Math.cos(lon - sLon), -1, 1));
        if (d < size * 1.9) bright *= 0.45 + 0.55 * smooth(size * 0.55, size * 1.9, d) + (d < size * 0.55 ? -0.25 : 0);
      }
      map[row * W + col] = sunClamp(bright, 0.05, 1.1);
    }
  }
  // Where each pixel of the face lands on the surface, worked out once: turning is only adding to
  // its longitude, so a bigger sun costs a lookup per pixel and no trigonometry.
  const half = side / 2;
  const cells = [];
  for (let py = 0; py < side; py += 1) {
    const ny = (py + 0.5 - half) / half;
    for (let px = 0; px < side; px += 1) {
      const nx = (px + 0.5 - half) / half;
      const rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const mu = Math.sqrt(1 - rr);
      // A slight lean, so the spots' bands are not a flat line across the face.
      const lat = Math.asin(sunClamp(-ny * 0.96 + mu * 0.28, -1, 1));
      const v = sunClamp(lat / Math.PI + 0.5, 0, 0.999);
      cells.push((py * side + px) * 4, Math.floor(v * H) * W, Math.atan2(nx, mu) / (Math.PI * 2), mu, Math.min(1, (1 - Math.sqrt(rr)) * half * 0.9));
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const pen = canvas.getContext('2d');
  const image = pen.createImageData(side, side);
  const sun = { canvas, paintedAt: -1 };
  // `turn` in radians; `life` dims it while the Coordinator's room sleeps.
  sun.paint = (turn, life = 1) => {
    const data = image.data;
    const shift = turn / (Math.PI * 2);
    for (let i = 0; i < cells.length; i += 5) {
      const k = cells[i], mu = cells[i + 3];
      const u = ((cells[i + 2] + shift) % 1 + 1) % 1;
      const g = map[cells[i + 1] + Math.floor(u * W)];
      // The pattern fades toward the limb, where the cells foreshorten.
      const grain = 1 + (g - 0.86) * (0.35 + 0.65 * mu);
      for (let c = 0; c < 3; c += 1) {
        const limb = 1 - SUN_LIMB[c] * (1 - mu);
        data[k + c] = sunClamp(SUN_TONE[c] * limb * grain * life * 1.04, 0, 255);
      }
      data[k + 3] = 255 * cells[i + 4];
    }
    pen.putImageData(image, 0, 0);
  };
  return sun;
}

// The sun where it sits: the warm light it gives, wide and breathing a little, then its body, then a
// tight bright skin gripping the limb. The same in Home's planets view and at the centre of a map.
export function drawSun(ctx, x, y, r, sun, { life = 1, beat = 0, lit = 0 } = {}) {
  ctx.globalCompositeOperation = 'lighter';
  const reach = r * (3.4 + 0.15 * beat);
  const glow = ctx.createRadialGradient(x, y, r * 0.9, x, y, reach);
  glow.addColorStop(0, `rgba(255, 196, 110, ${0.42 * life})`);
  glow.addColorStop(0.18, `rgba(255, 150, 60, ${0.2 * life})`);
  glow.addColorStop(0.5, `rgba(240, 96, 30, ${0.07 * life})`);
  glow.addColorStop(1, 'rgba(200, 60, 20, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, reach, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sun.canvas, x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'lighter';
  const skin = ctx.createRadialGradient(x, y, r * 0.94, x, y, r * 1.18);
  skin.addColorStop(0, `rgba(255, 226, 160, ${Math.min(1, (0.5 + 0.4 * lit) * life)})`);
  skin.addColorStop(0.35, `rgba(255, 170, 80, ${Math.min(1, (0.22 + 0.25 * lit) * life)})`);
  skin.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

// ---- What each planet is made of, at one point of its sphere.
//
// Craters: one candidate in each cell of a lattice laid through the body, kept only where the cell's
// hash says so, each with a size of its own (many small ones, few large). Each is a bowl, a raised
// rim and a blanket of thrown-out rock round it; a young one, now and then, has a bright floor and
// rays streaking out from it. Returns the height and the brightness of the rays.
const CRATER = new Float32Array(2);
function craterField(x, y, z, density) {
  const P = NOISE_PERM;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const keep = density * 255;
  let height = 0;
  let rays = 0;
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const h = P[(P[(P[(xi + dx) & 255] + ((yi + dy) & 255)) & 255] + ((zi + dz) & 255)) & 255];
    if (P[(h + 31) & 255] > keep) continue;
    const ox = x - (xi + dx + P[h] / 255);
    const oy = y - (yi + dy + P[(h + 85) & 255] / 255);
    const oz = z - (zi + dz + P[(h + 170) & 255] / 255);
    const size = 0.14 + 0.36 * (P[(h + 113) & 255] / 255) ** 2;
    const far = ox * ox + oy * oy + oz * oz;
    if (far > size * size * 6.25) continue;
    const reach = Math.sqrt(far);
    const d = reach / size;
    height += (d < 1 ? -(1 - d * d) * 0.9 : 0) + 0.3 * Math.exp(-(((d - 1) / 0.17) ** 2)) + 0.1 * Math.exp(-Math.abs(d - 1) / 0.45);
    if (P[(h + 57) & 255] < 34) {
      const inv = 1 / (reach || 1);
      const streak = gradientNoise(ox * inv * 7 + h * 0.37, oy * inv * 7, oz * inv * 7);
      rays += (d < 1 ? 0.4 : 0) + Math.max(0, streak) * 1.6 * smooth(0.85, 1.1, d) * Math.exp(-Math.max(0, d - 1) / 0.6);
    }
  }
  CRATER[0] = height;
  CRATER[1] = rays;
  return CRATER;
}

// One point of a planet: its colour (0..1, as seen), how glossy it is (open water), how much cloud
// is over it, and its height. `s` is written in place: r, g, b, gloss, cloud, height.
function planetSurface(kind, x, y, z, s) {
  let r;
  let g;
  let b;
  let gloss = 0;
  let cloud = 0;
  let height = 0;
  if (kind === 'decision') {
    // Mars. Bright dust and dark basalt, the dark lying more in one hemisphere; low old craters; a
    // long canyon near the equator; and the cap of ice at each pole, larger at one.
    const warp = fractalNoise(x * 1.4 + 31, y * 1.4, z * 1.4, 3) - 0.5;
    const basalt = smooth(0.5, 0.68, fractalNoise(x * 1.9 + warp * 1.6, y * 1.9 + 7 + warp, z * 1.9 - warp * 1.6, 5) + 0.09 * smooth(-0.3, 0.5, y));
    const dust = fractalNoise(x * 6 + 3, y * 6, z * 6, 4);
    craterField(x * 4 + 70, y * 4, z * 4, 0.4);
    const big = CRATER[0];
    craterField(x * 10 + 9, y * 10, z * 10, 0.45);
    const small = CRATER[0];
    const canyon = smooth(0.9, 0.975, 1 - Math.abs(gradientNoise(x * 2.4 + 2, y * 13, z * 2.4))) * Math.exp(-((y / 0.16) ** 2)) * smooth(0.1, 0.5, z);
    height = 0.4 * (fractalNoise(x * 2.4 + 50, y * 2.4, z * 2.4, 4) - 0.5) + 0.45 * big + 0.22 * small - 0.7 * canyon;
    const lift = 0.92 + 0.16 * dust;
    const dark = basalt * 0.85 + 0.35 * canyon;
    r = (0.79 + (0.4 - 0.79) * dark) * lift;
    g = (0.46 + (0.25 - 0.46) * dark) * lift;
    b = (0.25 + (0.17 - 0.25) * dark) * lift;
    const edge = 0.035 * gradientNoise(x * 9, y * 9, z * 9);
    const cap = Math.max(smooth(0.885, 0.91, -y + edge), smooth(0.93, 0.95, y + edge));
    r += (0.95 - r) * cap; g += (0.93 - g) * cap; b += (0.9 - b) * cap;
    height += 0.06 * cap;
  } else if (kind === 'preference') {
    // The Earth. Continents out of warped noise, a shallow shelf round them, green where it is wet,
    // sand in the dry belts either side of the tropics, tundra and ice toward the poles; mountains
    // from a ridged noise; clouds in streets along the latitudes, thicker at the equator and in the
    // storm belts, clearer over the deserts.
    const w = fractalNoise(x * 1.3 + 11, y * 1.3, z * 1.3, 3) - 0.5;
    const c = fractalNoise(x * 1.3 + w * 1.3, y * 1.3 + w, z * 1.3 - w * 1.3 + 2, 6);
    const SEA = 0.58;   // about a third of the globe is land
    const land = smooth(SEA, SEA + 0.012, c);
    const shelf = smooth(SEA - 0.07, SEA, c) ** 2;
    const ay = Math.abs(y);
    const detail = fractalNoise(x * 12, y * 12, z * 12, 3);
    const moist = fractalNoise(x * 3.1 + 21, y * 3.1, z * 3.1, 4);
    const desert = smooth(0.35, 0.62, Math.exp(-(((ay - 0.4) / 0.17) ** 2)) * 0.9 + (0.5 - moist) * 1.1);
    const relief = smooth(SEA + 0.02, SEA + 0.22, c);
    const ridges = 1 - Math.abs(gradientNoise(x * 9 + 5, y * 9, z * 9));
    const tropic = Math.exp(-((ay / 0.24) ** 2));
    let lr = 0.11 + 0.06 * detail - 0.04 * tropic;
    let lg = 0.22 + 0.07 * detail - 0.05 * tropic;
    let lb = 0.07 + 0.02 * detail - 0.02 * tropic;
    lr += (0.66 * (0.9 + 0.2 * detail) - lr) * desert;
    lg += (0.53 * (0.9 + 0.2 * detail) - lg) * desert;
    lb += (0.34 * (0.9 + 0.2 * detail) - lb) * desert;
    const tundra = smooth(0.6, 0.75, ay);
    lr += (0.36 - lr) * tundra; lg += (0.34 - lg) * tundra; lb += (0.28 - lb) * tundra;
    const peaks = 0.45 * relief * ridges;
    lr += (0.44 - lr) * peaks; lg += (0.38 - lg) * peaks; lb += (0.32 - lb) * peaks;
    const wr = 0.012 + (0.035 - 0.012) * shelf;
    const wg = 0.045 + (0.15 - 0.045) * shelf;
    const wb = 0.13 + (0.24 - 0.13) * shelf;
    r = wr + (lr - wr) * land;
    g = wg + (lg - wg) * land;
    b = wb + (lb - wb) * land;
    const ice = Math.max(smooth(0.84, 0.875, ay + 0.04 * (detail - 0.5)) * land, smooth(0.9, 0.93, ay + 0.03 * (detail - 0.5)));
    r += (0.92 - r) * ice; g += (0.94 - g) * ice; b += (0.96 - b) * ice;
    gloss = (1 - land) * (1 - ice);
    height = land * (0.12 + 0.7 * relief * ridges + 0.08 * detail);
    // Clouds: swirled twice, a broad turn and a tighter one, drawn out along the latitudes, and torn
    // at the edges by a finer noise so they are wisps and streets rather than lumps.
    const cw = fractalNoise(x * 2.2 + 41, y * 2.2, z * 2.2, 3) - 0.5;
    const cv = fractalNoise(x * 5 + 13, y * 5 + cw, z * 5, 2) - 0.5;
    const cn = fractalNoise(x * 3.2 + cw * 2 + cv * 0.6, y * 6 + cw * 1.2, z * 3.2 - cw * 2 + 9 - cv * 0.6, 5);
    const torn = fractalNoise(x * 16 + cv, y * 26, z * 16, 3);
    const belts = 0.12 * Math.exp(-((y / 0.1) ** 2)) + 0.1 * Math.exp(-(((ay - 0.75) / 0.1) ** 2)) - 0.08 * Math.exp(-(((ay - 0.4) / 0.12) ** 2));
    cloud = smooth(0.5, 0.8, cn + belts + 0.22 * (torn - 0.5)) * (0.7 + 0.3 * torn);
  } else if (kind === 'question') {
    // Uranus. Nearly featureless: bands a few hundredths apart in brightness, wavering a little, and
    // a brighter haze over the pole that faces us.
    const swirl = gradientNoise(x * 2.2 + 7, y * 2.2, z * 2.2);
    const band = Math.sin(y * 16 + swirl * 0.8);
    const hood = smooth(0.35, 0.85, -y);
    const fine = fractalNoise(x * 5, y * 18, z * 5, 3) - 0.5;
    const v = 1 + 0.022 * band + 0.07 * hood + 0.025 * fine;
    r = 0.6 * v;
    g = 0.84 * v;
    b = 0.88 * v + 0.02 * hood;
  } else {
    // Mercury. Craters on three scales, fewer on the smooth plains; a fine grit; broad provinces a
    // little lighter or darker; and the rays of the young craters.
    const tone = fractalNoise(x * 2.1 + 5, y * 2.1, z * 2.1, 4);
    const plains = smooth(0.56, 0.72, fractalNoise(x * 1.4 + 17, y * 1.4 + 3, z * 1.4, 3));
    craterField(x * 3 + 40, y * 3, z * 3, 0.55);
    const h1 = CRATER[0], r1 = CRATER[1];
    craterField(x * 7 + 11, y * 7, z * 7, 0.6);
    const h2 = CRATER[0], r2 = CRATER[1];
    craterField(x * 16 + 3, y * 16, z * 16, 0.75);
    const h3 = CRATER[0], r3 = CRATER[1];
    const grit = gradientNoise(x * 45, y * 45, z * 45);
    height = h1 + h2 * 0.5 * (1 - 0.5 * plains) + h3 * 0.22 * (1 - 0.7 * plains) + grit * 0.04;
    const a = 0.4 + 0.16 * (tone - 0.5) + 0.05 * plains + 0.2 * Math.min(1, r1 + r2 * 0.7 + r3 * 0.4) + 0.02 * grit;
    r = a * 1.05;
    g = a;
    b = a * 0.92;
  }
  s[0] = Math.min(1, Math.max(0, r));
  s[1] = Math.min(1, Math.max(0, g));
  s[2] = Math.min(1, Math.max(0, b));
  s[3] = gloss;
  s[4] = cloud;
  s[5] = height;
  return s;
}

// The whole surface of one planet: at each texel the colour, gloss, cloud and height, and the slope
// of the height east and south (per radian of arc), which is what the light reads the relief from.
// Built a band of rows at a time when asked to be (`rows`), so the work can be spread over frames;
// the map is handed out only once it is whole, slopes and all.
const PLANET_STRIDE = 8;
const planetMaps = new Map();
function planetMap(kind, rows = ALBEDO_H) {
  const key = planetOf(kind);
  let build = planetMaps.get(key);
  if (build?.done) return build.map;
  if (!build) {
    build = { map: new Float32Array(ALBEDO_W * ALBEDO_H * PLANET_STRIDE), next: 0, done: false };
    planetMaps.set(key, build);
  }
  const { map } = build;
  const texel = new Float32Array(6);
  const until = Math.min(ALBEDO_H, build.next + rows);
  for (let row = build.next; row < until; row += 1) {
    const lat = ((row + 0.5) / ALBEDO_H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let col = 0; col < ALBEDO_W; col += 1) {
      const lon = (col / ALBEDO_W) * Math.PI * 2;
      planetSurface(key, cl * Math.sin(lon), sl, cl * Math.cos(lon), texel);
      map.set(texel, (row * ALBEDO_W + col) * PLANET_STRIDE);
    }
  }
  build.next = until;
  if (until < ALBEDO_H) return null;
  const east = (2 * Math.PI) / ALBEDO_W;
  const south = Math.PI / ALBEDO_H;
  for (let row = 0; row < ALBEDO_H; row += 1) {
    const cl = Math.max(0.2, Math.cos(((row + 0.5) / ALBEDO_H - 0.5) * Math.PI));
    const up = Math.max(0, row - 1), down = Math.min(ALBEDO_H - 1, row + 1);
    for (let col = 0; col < ALBEDO_W; col += 1) {
      const at = (row * ALBEDO_W + col) * PLANET_STRIDE;
      const left = (row * ALBEDO_W + ((col + ALBEDO_W - 1) % ALBEDO_W)) * PLANET_STRIDE;
      const right = (row * ALBEDO_W + ((col + 1) % ALBEDO_W)) * PLANET_STRIDE;
      map[at + 6] = (map[right + 5] - map[left + 5]) / (2 * east * cl);
      map[at + 7] = (map[(down * ALBEDO_W + col) * PLANET_STRIDE + 5] - map[(up * ALBEDO_W + col) * PLANET_STRIDE + 5]) / ((down - up) * south);
    }
  }
  build.done = true;
  return map;
}


// Every pixel of a disc `size` pixels across: which way it faces, where on the map it reads,
// and how much of it the disc covers, so the edge is smooth without a second pass.
function sphereTable(size) {
  if (sphereTables.has(size)) return sphereTables.get(size);
  const half = size / 2;
  const cells = [];
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5 - half) / half;
      const y = (py + 0.5 - half) / half;
      const rr = x * x + y * y;
      const edge = (1 - Math.sqrt(rr)) * half + 0.5;
      if (edge <= 0) continue;
      const z = Math.sqrt(Math.max(0, 1 - rr));
      const lon = Math.atan2(x, z);
      const lat = Math.asin(Math.max(-1, Math.min(1, y)));
      const row = Math.max(0, Math.min(ALBEDO_H - 1.001, (lat / Math.PI + 0.5) * ALBEDO_H - 0.5));
      cells.push(py * size + px, x, y, z, (lon / (Math.PI * 2)) * ALBEDO_W, row, Math.min(1, edge));
    }
  }
  const table = { size, cells: Float32Array.from(cells) };
  sphereTables.set(size, table);
  return table;
}

// Every pixel of a planet's painted face, `size` pixels across with its disc `halo` times smaller,
// so the air has room past the limb. For the disc: where it is, which way it faces, where on the
// map it reads, how much of the pixel the disc covers, and which ways east and south run there (the
// relief tilts the light along those). For the ring past the limb: which way it points and how far
// out it is. Worked out once per size and kept.
const globeTables = new Map();
// Each planet turns about its own axis, leaning a little to one side or the other (2026-11-19, the
// author: «rotación sobre su propio eje de forma aleatoria y en diferentes velocidades, que no sean
// tan rápidas»). The lean is one of a few, so the faces stay worked out once and kept like the rest;
// the oldest are let go when there are many sizes, since a zoom makes a new size of every body.
export const PLANET_TILTS = [-0.42, -0.26, -0.12, 0.12, 0.26, 0.42];
const GLOBE_STRIDE = 13;
function globeTable(size, halo = 1, tilt = 0) {
  const key = `${size}:${halo}:${tilt}`;
  if (globeTables.has(key)) return globeTables.get(key);
  if (globeTables.size > 48) globeTables.delete(globeTables.keys().next().value);
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  const half = size / 2;
  const R = half / halo;
  const disc = [];
  const ring = [];
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5 - half) / R;
      const y = (py + 0.5 - half) / R;
      const rr = x * x + y * y;
      const rho = Math.sqrt(rr);
      const cover = Math.min(1, Math.max(0, (1 - rho) * R + 0.5));
      if (cover > 0) {
        const z = Math.sqrt(Math.max(0, 1 - rr));
        // Where this pixel is on the body, whose axis leans `tilt` in the plane of the view.
        const bx = x * cosT + y * sinT;
        const by = -x * sinT + y * cosT;
        const lon = Math.atan2(bx, z);
        const lat = Math.asin(Math.max(-1, Math.min(1, by)));
        const v = Math.max(0, Math.min(ALBEDO_H - 1.001, (lat / Math.PI + 0.5) * ALBEDO_H - 0.5));
        const cl = Math.hypot(bx, z) || 1e-6;
        // East and south on the body, turned back into the view for the relief.
        const ebx = z / cl, ebz = -bx / cl;
        const sbx = (-by * bx) / cl, sby = cl, sbz = (-by * z) / cl;
        disc.push(py * size + px, x, y, z, (lon / (Math.PI * 2)) * ALBEDO_W, v, cover,
          ebx * cosT, ebz, sbx * cosT - sby * sinT, sbx * sinT + sby * cosT, sbz, ebx * sinT);
      }
      if (halo > 1 && cover < 1 && rho < halo) ring.push(py * size + px, x / (rho || 1), y / (rho || 1), rho, cover);
    }
  }
  const table = { size, halo, disc: Float32Array.from(disc), ring: Float32Array.from(ring) };
  globeTables.set(key, table);
  return table;
}

// One point of a planet in the light. `s` is what is there (planetSurface, or the map read between
// texels), (x, y, z) where it is on the sphere in view space, (ex, ez) and (sx, sy, sz) the ways east
// and south run there, `L` the direction of the sun and `H` the half-way direction between the sun
// and the eye (for the glint). Writes the colour as seen, 0..1, into `rgb`.
function lightTexel(planet, s, x, y, z, ex, ez, sx, sy, sz, L, H, exposure, fade, fill, rgb, ey = 0) {
  const k = planet.bump;
  let nx = x - k * (s[6] * ex + s[7] * sx);
  let ny = y - k * (s[6] * ey + s[7] * sy);
  let nz = z - k * (s[6] * ez + s[7] * sz);
  const nn = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
  nx *= nn; ny *= nn; nz *= nn;
  // Where day ends is the sphere's business; the relief only tilts the light within it.
  const geo = x * L[0] + y * L[1] + z * L[2];
  const lit = nx * L[0] + ny * L[1] + nz * L[2];
  const mu = Math.max(0.0001, z);
  let day;
  if (planet.rocky) {
    const d = Math.max(0, lit);
    day = (0.62 * d + (0.76 * d) / (d + Math.max(mu, 0.25))) * smooth(-0.1, 0.06, geo);
  } else {
    const w = planet.wrap;
    day = Math.max(0, (lit + w) / (1 + w)) * smooth(-1.5 * w, w, geo) * (1 - planet.limb * (1 - Math.sqrt(mu)));
  }
  let ar = s[0], ag = s[1], ab = s[2];
  const cloud = planet.clouds ? s[4] : 0;
  if (cloud) { ar += (0.93 - ar) * cloud; ag += (0.94 - ag) * cloud; ab += (0.96 - ab) * cloud; }
  let lr = day * SUN_LIGHT[0] * exposure;
  let lg = day * SUN_LIGHT[1] * exposure;
  let lb = day * SUN_LIGHT[2] * exposure;
  if (planet.air && !planet.rocky) {
    // Sunset along the terminator: the light that reaches it has crossed the most air.
    const dusk = smooth(-0.02, 0.3, geo);
    lg *= 0.8 + 0.2 * dusk;
    lb *= 0.6 + 0.4 * dusk;
  }
  const ambient = PLANET_AMBIENT + fill * (0.16 + 0.2 * mu);
  let r = ar * ar * (lr + ambient);
  let g = ag * ag * (lg + ambient);
  let b = ab * ab * (lb + ambient);
  if (planet.ocean && geo > 0) {
    const wet = s[3] * (1 - cloud);
    if (wet > 0.01) {
      const nh = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
      const glint = wet * (0.55 * nh ** 70 + 0.05 * nh ** 8) * smooth(0, 0.18, geo) * exposure;
      r += glint; g += glint * 0.96; b += glint * 0.9;
    }
  }
  if (planet.air) {
    // The air over the disc: thicker toward the limb, lit where the sun is.
    const haze = (1 - mu) ** 2.2 * smooth(-0.25, 0.35, geo) * planet.airGlow * 0.42 * exposure;
    r += planet.air[0] * planet.air[0] * haze;
    g += planet.air[1] * planet.air[1] * haze;
    b += planet.air[2] * planet.air[2] * haze;
  }
  if (fade > 0) {
    // Out of circulation: the colour goes out of it and it dims, as the faded stars used to.
    const grey = 0.3 * r + 0.59 * g + 0.11 * b;
    const keep = 1 - 0.55 * fade;
    r = (r + (grey - r) * 0.8 * fade) * keep;
    g = (g + (grey - g) * 0.8 * fade) * keep;
    b = (b + (grey - b) * 0.8 * fade) * keep;
  }
  rgb[0] = Math.sqrt(Math.min(1, r));
  rgb[1] = Math.sqrt(Math.min(1, g));
  rgb[2] = Math.sqrt(Math.min(1, b));
  return rgb;
}

// The halo of the air past the limb, laid over what the disc already painted: lit on the side the
// sun is on, and all the way round when the sun is behind the planet and the air is seen against it.
// Never thinner than about a pixel, so a small planet crossing the sun still shows its ring of air.
function haloInto(out, table, planet, L, exposure, fade) {
  if (!planet.air || !table.ring.length) return out;
  const ring = table.ring;
  const behind = Math.max(0, -L[2]) ** 1.5;
  const glow = planet.airGlow * exposure * (1 - 0.6 * fade);
  const thickness = Math.max(planet.thickness, (1.2 * table.halo * 2) / table.size);
  for (let i = 0; i < ring.length; i += 5) {
    const p = ring[i] * 4;
    const rho = ring[i + 3];
    const facing = ring[i + 1] * L[0] + ring[i + 2] * L[1];
    const lit = Math.max(smooth(-0.2, 0.5, facing) * (0.8 + 0.4 * behind), 0.8 * behind);
    const a = Math.min(1, glow * lit * Math.exp(-Math.max(0, rho - 1) / thickness));
    if (a <= 0.002) continue;
    const under = out[p + 3] / 255;
    const alpha = under + a * (1 - under);
    for (let c = 0; c < 3; c += 1) out[p + c] = Math.min(255, (out[p + c] * under + 255 * planet.air[c] * a) / alpha);
    out[p + 3] = 255 * alpha;
  }
  return out;
}

// The shading itself. Pure: a table (globeTable), the map (planetMap) and the moment in, RGBA out.
// `light` is the direction of the sun in view space (x right, y down, z toward the eye), `turn` how
// far the body has spun, `exposure` how much of the light it shows (what the room has made of it),
// `fade` whether it is out of circulation, `fill` how much a held planet is lit from the front.
function shadePlanet(out, table, map, { kind, light, turn = 0, exposure = 1, fade = 0, fill = 0 }) {
  out.fill(0);
  const planet = PLANETS[planetOf(kind)];
  const L = light;
  const hz = L[2] + 1;
  const hn = Math.hypot(L[0], L[1], hz) || 1;
  const H = [L[0] / hn, L[1] / hn, hz / hn];
  const shift = ((((turn / (Math.PI * 2)) % 1) + 1) % 1) * ALBEDO_W;
  // The clouds keep their own pace over the ground.
  const drift = planet.clouds ? ((((turn * 0.08) / (Math.PI * 2)) % 1) + 1) % 1 * ALBEDO_W : 0;
  const cells = table.disc;
  const s = new Float32Array(PLANET_STRIDE);
  const rgb = [0, 0, 0];
  const read = (u, v, channel) => {
    const u0 = Math.floor(u);
    const fu = u - u0;
    const c0 = ((u0 % ALBEDO_W) + ALBEDO_W) % ALBEDO_W;
    const c1 = (c0 + 1) % ALBEDO_W;
    const r0 = Math.floor(v);
    const fv = v - r0;
    const r1 = Math.min(ALBEDO_H - 1, r0 + 1);
    const a = (r0 * ALBEDO_W + c0) * PLANET_STRIDE + channel, b = (r0 * ALBEDO_W + c1) * PLANET_STRIDE + channel;
    const c = (r1 * ALBEDO_W + c0) * PLANET_STRIDE + channel, d = (r1 * ALBEDO_W + c1) * PLANET_STRIDE + channel;
    return (map[a] * (1 - fu) + map[b] * fu) * (1 - fv) + (map[c] * (1 - fu) + map[d] * fu) * fv;
  };
  for (let i = 0; i < cells.length; i += GLOBE_STRIDE) {
    // Read between texels, never from one: a close planet is larger than its map.
    const u = cells[i + 4] + shift;
    const v = cells[i + 5];
    const u0 = Math.floor(u);
    const fu = u - u0;
    const c0 = ((u0 % ALBEDO_W) + ALBEDO_W) % ALBEDO_W;
    const c1 = (c0 + 1) % ALBEDO_W;
    const r0 = Math.floor(v);
    const fv = v - r0;
    const r1 = Math.min(ALBEDO_H - 1, r0 + 1);
    const a = (r0 * ALBEDO_W + c0) * PLANET_STRIDE, b = (r0 * ALBEDO_W + c1) * PLANET_STRIDE;
    const c = (r1 * ALBEDO_W + c0) * PLANET_STRIDE, d = (r1 * ALBEDO_W + c1) * PLANET_STRIDE;
    const wa = (1 - fu) * (1 - fv), wb = fu * (1 - fv), wc = (1 - fu) * fv, wd = fu * fv;
    for (let k = 0; k < PLANET_STRIDE; k += 1) s[k] = map[a + k] * wa + map[b + k] * wb + map[c + k] * wc + map[d + k] * wd;
    if (planet.clouds) s[4] = read(cells[i + 4] + shift + drift, v, 4);
    lightTexel(planet, s, cells[i + 1], cells[i + 2], cells[i + 3], cells[i + 7], cells[i + 8], cells[i + 9], cells[i + 10], cells[i + 11], L, H, exposure, fade, fill, rgb, cells[i + 12]);
    const p = cells[i] * 4;
    out[p] = 255 * rgb[0];
    out[p + 1] = 255 * rgb[1];
    out[p + 2] = 255 * rgb[2];
    out[p + 3] = 255 * cells[i + 6];
  }
  return haloInto(out, table, planet, L, exposure, fade);
}

// ---- The legend's planets (2026-11-15; the stars before them moved here from app.js on 2026-10-10,
// so the Project map draws the same ones as the Memory map). The same planet the map paints, small:
// the same surface and the same light, the sun high on the left and a little in front, so each shows
// its day, its terminator and a sliver of night. Read straight from the surface at each pixel, so it
// needs no map built first and is ready the moment the legend is. Painted at twice its size and
// brought down, so the craters and the clouds settle into the few pixels they have instead of
// speckling them; made once per planet and size, and copied for every legend that asks.
const CHIP_LIGHT = (() => { const l = [-0.62, -0.46, 0.64]; const n = Math.hypot(...l); return l.map((value) => value / n); })();
// As much of the light as a memory the room has used a little shows on the map.
const CHIP_EXPOSURE = 1.2;
const chipFaces = new Map();
export function planetChip(kind, px, { faded = false } = {}) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const size = Math.max(4, Math.round(px * dpr));
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${px}px`;
  canvas.style.height = `${px}px`;
  const paint = canvas.getContext('2d');
  if (!paint?.createImageData) return canvas;
  const key = `${planetOf(kind)}:${size}:${faded ? 1 : 0}`;
  let face = chipFaces.get(key);
  if (!face) {
    face = chipFace(planetOf(kind), size * 2, faded);
    chipFaces.set(key, face);
  }
  if (face) {
    paint.imageSmoothingQuality = 'high';
    paint.drawImage(face, 0, 0, size, size);
  }
  return canvas;
}
function chipFace(key, size, faded) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const paint = canvas.getContext('2d');
  if (!paint?.createImageData) return null;
  const planet = PLANETS[key];
  const table = globeTable(size, planet.air ? 1.1 : 1);
  const image = paint.createImageData(size, size);
  const out = image.data;
  const L = CHIP_LIGHT;
  const hn = Math.hypot(L[0], L[1], L[2] + 1);
  const H = [L[0] / hn, L[1] / hn, (L[2] + 1) / hn];
  const s = new Float32Array(PLANET_STRIDE);
  const t = new Float32Array(6);
  const rgb = [0, 0, 0];
  // The relief is read a pixel apart: finer than that, it is noise the chip cannot show.
  const step = 2.2 / size;
  const cells = table.disc;
  const at = (lon, lat, into) => { const cl = Math.cos(lat); return planetSurface(key, cl * Math.sin(lon), Math.sin(lat), cl * Math.cos(lon), into); };
  for (let i = 0; i < cells.length; i += GLOBE_STRIDE) {
    const x = cells[i + 1], y = cells[i + 2], z = cells[i + 3];
    const lon = Math.atan2(x, z) + planet.face;
    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    at(lon, lat, s);
    const height = s[5];
    s[6] = (at(lon + step, lat, t)[5] - height) / (step * Math.max(0.2, Math.cos(lat)));
    s[7] = (at(lon, lat + step, t)[5] - height) / step;
    lightTexel(planet, s, x, y, z, cells[i + 7], cells[i + 8], cells[i + 9], cells[i + 10], cells[i + 11], L, H, CHIP_EXPOSURE, faded ? 1 : 0, 0, rgb);
    const p = cells[i] * 4;
    out[p] = 255 * rgb[0];
    out[p + 1] = 255 * rgb[1];
    out[p + 2] = 255 * rgb[2];
    out[p + 3] = 255 * cells[i + 6];
  }
  haloInto(out, table, planet, L, CHIP_EXPOSURE, faded ? 1 : 0);
  paint.putImageData(image, 0, 0);
  return canvas;
}

// ---- The aberration: a black hole (2026-11-15, asked by the author: «el agujero negro de la
// aberración también hacerlo más profundo»).
//
// A claim the room established is false, drawn as the one thing out here that gives nothing back.
// From the back to the front:
//   the pull: the dark reaches past the hole and dims whatever is behind it, wires and dust alike;
//   the field behind it, bent: every speck of dust is seen where the hole's gravity throws its light,
//     pushed out to a ring and stretched along it, and a second, fainter image on the far side;
//   the far half of its disc, and the light of that far half lifted over the top of the hole and
//     under the bottom, which is what a disc round a black hole looks like seen nearly edge on;
//   the horizon: black, all of it, with nothing painted inside;
//   the ring of light that has gone round the hole before reaching us, tight against the black;
//   the near half of the disc, crossing in front of the hole.
// The disc is cold, the aberration's violet running to white at its inner edge, and brighter on the
// side that turns toward us. Its streaks go round, the inner ones faster; not for whoever asked for
// stillness. Nothing about it is warm, so it does not read as a sun, and nothing about it is a
// planet, so it does not read as knowledge.
const HOLE_DISC_IN = 1.16;     // the disc's inner edge, in radii of the black
const HOLE_DISC_OUT = 2.8;     // and its outer edge
const HOLE_TILT = 0.2;         // how open the disc is to us: nearly edge on
const HOLE_EINSTEIN = 1.3;     // where the light of what is behind it gathers into a ring
const HOLE_STREAKS = 7;
const rgbOf = (hex) => [1, 3, 5].map((at) => Number.parseInt(String(hex).slice(at, at + 2), 16));
export function drawBlackHole(ctx, x, y, S, { t = 0, turn = 0, roll = 0, lit = 1, px = 1, still = false, colour = MEMORY_COLORS.aberration, dust = VOID_DUST.length, streaks = HOLE_STREAKS } = {}) {
  const tone = rgbOf(colour);
  if (tone.some((value) => !Number.isFinite(value))) tone.splice(0, 3, 177, 76, 255);
  const violet = tone.join(', ');
  const pale = tone.map((value) => Math.round(value + (255 - value) * 0.6)).join(', ');
  const deep = tone.map((value, i) => Math.round(value * [0.35, 0.3, 0.62][i])).join(', ');
  const k = 0.75 + 0.25 * Math.max(0, Math.min(1, lit));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  // The pull.
  ctx.globalCompositeOperation = 'source-over';
  const pull = ctx.createRadialGradient(0, 0, S * 0.9, 0, 0, S * 2.3);
  pull.addColorStop(0, 'rgba(0, 0, 0, .9)');
  pull.addColorStop(0.45, 'rgba(0, 0, 0, .42)');
  pull.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pull;
  ctx.beginPath(); ctx.arc(0, 0, S * 2.3, 0, Math.PI * 2); ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  // The field behind it, bent (the lens equation: a speck truly at `beta` is seen at the two roots).
  const ring = S * HOLE_EINSTEIN;
  for (let i = 0; i < Math.min(dust, VOID_DUST.length); i += 1) {
    const speck = VOID_DUST[i];
    const beta = S * (0.15 + 2.9 * speck.out);
    const root = Math.sqrt(beta * beta + 4 * ring * ring);
    const fade = 0.7 * (1 - speck.out * 0.6) * k * (still ? 0.75 : 0.45 + 0.55 * Math.abs(Math.sin(t * speck.rate + speck.phase)));
    const size = speck.size * px;
    for (const [seen, side, weight] of [[(beta + root) / 2, 0, 1], [(root - beta) / 2, Math.PI, 0.45]]) {
      if (seen < S * 1.03) continue;
      const angle = speck.angle + turn + side;
      const stretch = Math.min(3.5, seen / Math.max(beta, S * 0.2));
      ctx.save();
      ctx.translate(Math.cos(angle) * seen, Math.sin(angle) * seen);
      ctx.rotate(angle);
      ctx.scale(1, stretch);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.6);
      glow.addColorStop(0, `rgba(${speck.colour}, ${fade * weight})`);
      glow.addColorStop(0.35, `rgba(${speck.colour}, ${fade * weight * 0.3})`);
      glow.addColorStop(1, `rgba(${speck.colour}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, size * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Half of the disc, the far half (behind the black) or the near one (in front of it).
  const inner = S * HOLE_DISC_IN;
  const outer = S * HOLE_DISC_OUT;
  const disc = (near) => {
    const from = near ? 0 : Math.PI;
    const to = from + Math.PI;
    ctx.save();
    ctx.scale(1, HOLE_TILT);
    ctx.beginPath(); ctx.arc(0, 0, outer, from, to); ctx.arc(0, 0, inner, to, from, true); ctx.closePath();
    const body = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
    body.addColorStop(0, `rgba(250, 244, 255, ${0.92 * k})`);
    body.addColorStop(0.3, `rgba(${pale}, ${0.78 * k})`);
    body.addColorStop(0.62, `rgba(${violet}, ${0.48 * k})`);
    body.addColorStop(0.88, `rgba(${deep}, ${0.16 * k})`);
    body.addColorStop(1, `rgba(${deep}, 0)`);
    ctx.fillStyle = body;
    ctx.fill();
    // The side turning toward us is the brighter one: a light over the left of the ring that is
    // gone before the ring's edges, so it adds no edge of its own.
    const lobe = (outer - inner) * 0.62;
    const beam = ctx.createRadialGradient(-(inner + outer) / 2, 0, 0, -(inner + outer) / 2, 0, lobe);
    beam.addColorStop(0, `rgba(236, 226, 255, ${0.45 * k})`);
    beam.addColorStop(1, 'rgba(236, 226, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fill();
    // The streaks: the inner ones go round faster.
    ctx.lineCap = 'round';
    for (let n = 0; n < streaks; n += 1) {
      const along = 0.08 + 0.8 * frac(n * 0.618);
      const radius = inner + (outer - inner) * along;
      const start = n * 2.39996 + turn + (still ? 0 : t * 0.9 * (inner / radius) ** 1.5);
      const span = 0.35 + 0.5 * frac(n * 0.37);
      ctx.strokeStyle = `rgba(242, 234, 255, ${0.2 * k * (1 - along)})`;
      ctx.lineWidth = Math.max(px * 0.7, S * 0.035);
      for (const lap of [-Math.PI * 2, 0, Math.PI * 2]) {
        const a = Math.max(from, (((start % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) + lap);
        const b = Math.min(to, (((start % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) + lap + span);
        if (b > a) { ctx.beginPath(); ctx.arc(0, 0, radius, a, b); ctx.stroke(); }
      }
    }
    ctx.restore();
  };
  disc(false);
  // The far half's light, lifted over the top of the hole: a band hugging the black, brightest
  // against it, thickest at the top and thinning to where it meets the disc at the sides; and,
  // much thinner, the same under the bottom.
  ctx.save();
  ctx.scale(1, 1.16);
  ctx.beginPath(); ctx.arc(0, 0, S * 1.38, Math.PI, Math.PI * 2); ctx.closePath();
  const over = ctx.createRadialGradient(0, 0, S * 0.8, 0, 0, S * 1.38);
  over.addColorStop(0, `rgba(${pale}, 0)`);
  over.addColorStop(0.24, `rgba(250, 244, 255, ${0.82 * k})`);
  over.addColorStop(0.42, `rgba(${pale}, ${0.5 * k})`);
  over.addColorStop(0.72, `rgba(${violet}, ${0.18 * k})`);
  over.addColorStop(1, `rgba(${violet}, 0)`);
  ctx.fillStyle = over;
  ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, S * 1.12, 0, Math.PI); ctx.closePath();
  const under = ctx.createRadialGradient(0, 0, S * 0.95, 0, 0, S * 1.12);
  under.addColorStop(0, `rgba(${pale}, 0)`);
  under.addColorStop(0.4, `rgba(${pale}, ${0.22 * k})`);
  under.addColorStop(1, `rgba(${violet}, 0)`);
  ctx.fillStyle = under;
  ctx.fill();

  // The horizon.
  ctx.globalCompositeOperation = 'source-over';
  const black = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 1.02);
  black.addColorStop(0, 'rgba(0, 0, 0, 1)');
  black.addColorStop(0.95, 'rgba(0, 0, 0, 1)');
  black.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = black;
  ctx.beginPath(); ctx.arc(0, 0, S * 1.02, 0, Math.PI * 2); ctx.fill();

  // The ring of light that went round the hole first, brighter on the side the disc comes from.
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.arc(0, 0, S * 1.07, 0, Math.PI * 2); ctx.arc(0, 0, S * 0.98, Math.PI * 2, 0, true); ctx.closePath();
  const photons = ctx.createRadialGradient(0, 0, S * 0.98, 0, 0, S * 1.07);
  photons.addColorStop(0, 'rgba(255, 252, 255, 0)');
  photons.addColorStop(0.35, `rgba(255, 252, 255, ${0.6 * k})`);
  photons.addColorStop(0.6, `rgba(${pale}, ${0.2 * k})`);
  photons.addColorStop(1, `rgba(${violet}, 0)`);
  ctx.fillStyle = photons;
  ctx.fill();
  const side = ctx.createRadialGradient(-S * 0.7, 0, 0, -S * 0.7, 0, S * 1.3);
  side.addColorStop(0, `rgba(240, 232, 255, ${0.24 * k})`);
  side.addColorStop(1, 'rgba(240, 232, 255, 0)');
  ctx.fillStyle = side;
  ctx.fill();

  disc(true);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// The black hole, small enough for a chip: the same drawing, still.
export function collapsedChip(hex, px) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(px * dpr);
  canvas.height = Math.round(px * dpr);
  canvas.style.width = `${px}px`;
  canvas.style.height = `${px}px`;
  const paint = canvas.getContext('2d');
  if (!paint) return canvas;
  paint.scale(dpr, dpr);
  const r = px / 2;
  // The black at a third of the chip, so the disc runs nearly to its edges.
  drawBlackHole(paint, r, r, r * 0.34, { px: 0.3, lit: 0.9, still: true, colour: hex, dust: 14, streaks: 2, turn: 0.4 });
  return canvas;
}

// One planet's painted face, kept on its node and painted again only when it has changed enough to
// be seen. Null where there is no pixel buffer to paint into, and the planet is drawn the plainer
// way instead.
//
// What it costs is bounded per frame. A surface map is built one planet a frame, a band of rows at a
// time, so opening the map never stalls; until its planet is ready a memory is drawn the plainer
// way. And only so many faces are painted again each frame, in the order they are drawn; the rest
// keep last frame's face for one more, which at the pace these bodies turn nobody can tell.
const SHADE_BUDGET = 28;
const PLANET_ROWS_PER_FRAME = 8;

// ---- MOTHER's body, as molten rock.
//
// A crust of cooling rock, nearly black, broken into plates; between the plates, cracks running
// white-hot; under the crust, pools where it has melted through and the lava shows. The crust
// rides the body's turn, the lava underneath flows at a pace of its own, and where the two
// disagree the surface looks like it is moving rather than painted. Every so often something
// bursts inside: a flash, a white core, a ring of fire running out from it and fading.
//
// The map is built once, the way the planets' are, a band at a time; what changes frame to frame
// is only where it is read and what is bursting.
const MAGMA_W = 512;
const MAGMA_H = 256;
const MAGMA_SIZE = 220;          // the largest the body is ever painted; beyond it, it is scaled
const BLAST_EVERY = 1.6;         // seconds between bursts, on average
const BLAST_LIFE = 2.2;
// Rock to white heat: black crust, dark red, orange, yellow, white.
const LAVA_RAMP = [[0, [0.05, 0.012, 0.008]], [0.3, [0.42, 0.04, 0.012]], [0.55, [0.92, 0.24, 0.03]], [0.78, [1, 0.62, 0.16]], [1, [1, 0.94, 0.78]]];
const magmaBuild = { map: null, next: 0, done: false };

function lavaColour(heat, out) {
  const h = Math.min(1, Math.max(0, heat));
  for (let i = 1; i < LAVA_RAMP.length; i += 1) {
    const [at, colour] = LAVA_RAMP[i];
    if (h > at) continue;
    const [from, below] = LAVA_RAMP[i - 1];
    const f = (h - from) / (at - from);
    for (let k = 0; k < 3; k += 1) out[k] = below[k] + (colour[k] - below[k]) * f;
    return out;
  }
  for (let k = 0; k < 3; k += 1) out[k] = LAVA_RAMP[LAVA_RAMP.length - 1][1][k];
  return out;
}

// Four numbers a texel: the plates' cracks, the finer cracks inside them, where the crust has
// melted through, and grain for the rock itself.
export function magmaMap(rows = MAGMA_H) {
  if (magmaBuild.done) return magmaBuild.map;
  magmaBuild.map ??= new Float32Array(MAGMA_W * MAGMA_H * 4);
  const map = magmaBuild.map;
  const until = Math.min(MAGMA_H, magmaBuild.next + rows);
  for (let row = magmaBuild.next; row < until; row += 1) {
    const lat = ((row + 0.5) / MAGMA_H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let col = 0; col < MAGMA_W; col += 1) {
      const lon = ((col + 0.5) / MAGMA_W) * Math.PI * 2;
      const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
      const warp = fractalNoise(px * 2.2 + 5, py * 2.2, pz * 2.2, 3) - 0.5;
      const [near, next] = cellNoise(px * 6 + warp, py * 6, pz * 6 - warp);
      // Fine cracks at a frequency the map can carry: any finer and the cells alias into streaks.
      const [fineNear, fineNext] = cellNoise(px * 10 + warp * 2, py * 10, pz * 10);
      const pools = fractalNoise(px * 2.6 + warp * 1.5, py * 2.6 + 9, pz * 2.6, 5);
      const at = (row * MAGMA_W + col) * 4;
      map[at] = next - near;
      map[at + 1] = fineNext - fineNear;
      map[at + 2] = pools;
      map[at + 3] = fractalNoise(px * 11, py * 11, pz * 11 + 3, 3);
    }
  }
  magmaBuild.next = until;
  magmaBuild.done = until >= MAGMA_H;
  return magmaBuild.done ? map : null;
}

// Whether the slow textures are whole: MOTHER's crust and the surface of each planet. They are built
// a band at a time, shared by every scene; a scene painted before they are whole draws its planets
// the plainer way, and the Macroverso paints its sprites once more when this turns true.
export function texturesReady() {
  return Boolean(magmaBuild.done) && Object.keys(PLANETS).every((kind) => planetMaps.get(kind)?.done);
}
// One band more of the next planet's surface not yet whole, for whoever paints sprites that do not
// draw every frame (the Macroverso): without it a planet no universe on screen has would never be
// built, and the sprites painted before would keep the plainer drawing.
export function buildPlanets(rows = PLANET_ROWS_PER_FRAME) {
  const next = Object.keys(PLANETS).find((kind) => !planetMaps.get(kind)?.done);
  if (next) planetMap(next, rows);
  return !next;
}

// The shading. Pure: a table (sphereTable), the map, and the moment in; RGBA out. `turn` is how
// far the crust has turned, `flow` how far the lava under it has, `beat` the heartbeat, `blasts`
// the bursts alive now, each a direction on the visible face in view space and an age 0..1.
// Written for speed: it runs on the largest body on screen, so every read of the map is shared
// between the channels that use the same place, and the limb is worked out once per size.
const magmaLimbs = new Map();
// `tilt` is how far the human has turned the view up or down. The sun is a body in that same
// space: dragged, it turns with everything else instead of spinning in place on its own axis, so
// each pixel reads the map where that point of the body faces after the view's turn is undone.
function shadeMagma(out, table, map, { turn, flow, beat = 0, blasts = [], tilt = 0 }) {
  out.fill(0);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  const crustShift = (((turn / (Math.PI * 2)) % 1) + 1) % 1 * MAGMA_W;
  const lavaShift = (((flow / (Math.PI * 2)) % 1) + 1) % 1 * MAGMA_W;
  const cells = table.cells;
  let limbs = magmaLimbs.get(table);
  if (!limbs) {
    limbs = new Float32Array(cells.length / 7);
    for (let i = 0, j = 0; i < cells.length; i += 7, j += 1) limbs[j] = 0.32 + 0.68 * cells[i + 3] ** 0.55;
    magmaLimbs.set(table, limbs);
  }
  const scale = MAGMA_W / ALBEDO_W;
  const rowScale = MAGMA_H / ALBEDO_H;
  const colour = [0, 0, 0];
  const seamWidth = 0.07 + 0.025 * beat;
  for (let i = 0, j = 0; i < cells.length; i += 7, j += 1) {
    const nx = cells[i + 1], ny = cells[i + 2], mu = cells[i + 3];
    let base = cells[i + 4] * scale;
    let v = Math.min(MAGMA_H - 1.001, cells[i + 5] * rowScale);
    if (tilt) {
      const wy = ny * cosTilt + mu * sinTilt;
      const wz = mu * cosTilt - ny * sinTilt;
      base = (Math.atan2(nx, wz) / (Math.PI * 2)) * MAGMA_W;
      const lat = Math.asin(Math.max(-1, Math.min(1, wy)));
      v = Math.max(0, Math.min(MAGMA_H - 1.001, ((lat / Math.PI + 0.5) * ALBEDO_H - 0.5) * rowScale));
    }
    const r0 = v | 0;
    const fv = v - r0;
    const top = r0 * MAGMA_W;
    const bottom = Math.min(MAGMA_H - 1, r0 + 1) * MAGMA_W;
    // The crust: one place on the map, three things read from it.
    let u = base + crustShift;
    let u0 = Math.floor(u);
    let fu = u - u0;
    let c0 = u0 % MAGMA_W; if (c0 < 0) c0 += MAGMA_W;
    let c1 = c0 + 1 === MAGMA_W ? 0 : c0 + 1;
    let a = (top + c0) * 4, b = (top + c1) * 4, c = (bottom + c0) * 4, d = (bottom + c1) * 4;
    const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
    const crack = map[a] * w00 + map[b] * w10 + map[c] * w01 + map[d] * w11;
    const fine = map[a + 1] * w00 + map[b + 1] * w10 + map[c + 1] * w01 + map[d + 1] * w11;
    const grain = map[a + 3] * w00 + map[b + 3] * w10 + map[c + 3] * w01 + map[d + 3] * w11;
    // The lava under it, read where it has flowed to.
    u = base + lavaShift;
    u0 = Math.floor(u);
    fu = u - u0;
    c0 = u0 % MAGMA_W; if (c0 < 0) c0 += MAGMA_W;
    c1 = c0 + 1 === MAGMA_W ? 0 : c0 + 1;
    a = (top + c0) * 4; b = (top + c1) * 4; c = (bottom + c0) * 4; d = (bottom + c1) * 4;
    const pools = map[a + 2] * (1 - fu) * (1 - fv) + map[b + 2] * fu * (1 - fv) + map[c + 2] * (1 - fu) * fv + map[d + 2] * fu * fv;
    // White-hot along the plates' edges, hotter still where the beat pushes through; a fainter
    // web of finer cracks inside each plate; pools wherever the crust has melted through.
    const seam = 1 - smooth(0, seamWidth, crack);
    const web = (1 - smooth(0, 0.045, fine)) * 0.55;
    const melt = smooth(0.52, 0.78, pools + 0.06 * beat);
    let heat = Math.max(seam * 0.95, web, melt * 0.82) + 0.08 * grain;
    // Bursts: a small white core where it went off, and a ring of fire running out from it.
    for (let k = 0; k < blasts.length; k += 1) {
      const blast = blasts[k];
      const near = 1 - (nx * blast.x + ny * blast.y + mu * blast.z);
      if (near > 0.2) continue;
      const age = blast.age;
      const flash = Math.exp(-age * 7) * Math.exp(-near / (0.0015 + 0.006 * age));
      const front = 0.004 + 0.07 * age;
      const ring = Math.exp(-((near - front) ** 2) / (0.00012 + 0.0006 * age)) * (1 - age);
      heat += 1.1 * flash + 1.1 * ring;
    }
    lavaColour(heat, colour);
    // The edge is seen through more of its own smoke: darker and redder toward the limb.
    const limb = limbs[j];
    const p = cells[i] * 4;
    out[p] = 255 * Math.min(1, colour[0] * limb * (1.04 + 0.1 * beat));
    out[p + 1] = 255 * Math.min(1, colour[1] * limb * limb);
    out[p + 2] = 255 * Math.min(1, colour[2] * limb * limb * limb);
    out[p + 3] = 255 * cells[i + 6];
  }
  return out;
}

// Masses of molten matter riding the surface: `size` is how much of the face one covers, `rate`
// how slowly it swells and settles, `drift` how it crawls against the turning body. None of the
// rates match, so the face is never the same face twice.
const CORE_FLOWS = [
  { lat: -0.22, lon: 0.0, size: 0.46, drift: 0.0031, rate: 0.083, hot: false },
  { lat: 0.42, lon: 2.1, size: 0.34, drift: -0.0047, rate: 0.117, hot: true },
  { lat: -0.54, lon: 3.6, size: 0.28, drift: 0.0062, rate: 0.061, hot: true },
  { lat: 0.12, lon: 4.8, size: 0.52, drift: -0.0023, rate: 0.094, hot: false },
  { lat: 0.68, lon: 1.2, size: 0.24, drift: 0.0039, rate: 0.139, hot: true },
  { lat: -0.34, lon: 5.6, size: 0.38, drift: -0.0055, rate: 0.073, hot: true },
  { lat: 0.3, lon: 3.0, size: 0.44, drift: 0.0017, rate: 0.107, hot: false },
  { lat: -0.7, lon: 0.9, size: 0.22, drift: -0.0033, rate: 0.126, hot: true },
];

// How big a memory is drawn against the core. Everything else follows from the radius: how far
// two memories push each other apart, how wide the view opens, where the label sits, and how
// near the pointer has to be. Lower this and the whole constellation gives the core more room.
// One factor for every memory, so a small one stays in proportion to a large one: 0.64 is the 0.8
// it was, a fifth smaller, for less noise the moment NOSTROMO opens.
export const MEMORY_SCALE = 0.64;

// Life in the network: one pulse at a time, each on its own clock. The core sends more to the
// memories the room actually leans on, and two memories that share a theme talk to each other
// without the core in between. Nothing here is synchronised: that is the point.
const PULSE_SPEED = 330;     // world units per second
export const PULSE_CAP = 48;        // a ceiling, so a large archive stays light

// A line with current running along it. The gradient carries the colour of the wire from end to
// end, and riding on it is a narrow band of white heat that travels from one end to the other
// and comes round again. Moving the band is all it takes: one gradient a frame, not a hundred
// little strokes, and the eye reads it as charge on its way somewhere.
export function currentAlong(ctx, x0, y0, x1, y1, from, to, head, bright) {
  const line = ctx.createLinearGradient(x0, y0, x1, y1);
  // The wire's own colour, and then the band riding on it. Where the two want the same place
  // along the wire the band wins: it is the thing in motion, and dropping it there would make
  // the current blink out every time it passed the middle.
  const stops = [[0, from, 0], [0.5, to.mid ?? to.end, 0], [1, to.end, 0]];
  if (bright > 0.01) {
    const band = [[head - 0.07, `rgba(255, 246, 238, ${0.34 * bright})`], [head, `rgba(255, 255, 255, ${0.82 * bright})`], [head + 0.07, `rgba(255, 234, 222, ${0.3 * bright})`]];
    for (const [at, colour] of band) if (at > 0.001 && at < 0.999) stops.push([at, colour, 1]);
  }
  stops.sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  let last = -1;
  for (const [at, colour] of stops) {
    const place = Math.min(1, Math.max(0, at));
    if (place <= last) continue;
    line.addColorStop(place, colour);
    last = place;
  }
  return line;
}

// How big a travelling pulse is drawn. A pulse is a thing passing between two bodies, not a
// body: at the size it had it read as another small star and competed with the memories it was
// travelling to. Lower this and the constellation keeps its order of importance.
const PULSE_SCALE = 0.7;

// Where a pulse is right now, along the same curve its filament is drawn with.
export function alongCurve(x0, y0, cx, cy, x1, y1, u) {
  const v = 1 - u;
  return { x: v * v * x0 + 2 * v * u * cx + u * u * x1, y: v * v * y0 + 2 * v * u * cy + u * u * y1 };
}

// ---- The nebula the room sits in.
//
// It is the archive itself, seen from far enough away to be weather. Young, it is an electrical
// storm: scattered, cold, flickering, striking often. As the room grows it settles, gathers into
// a band, and the strikes become rare and slow.
//
// Its one rule is that it is never the subject. It is painted before anything else, in colours
// nothing in the foreground uses, at an opacity that is capped no matter how grown the room is.
// A reader should notice it only on looking for it; if it ever competes with the core, the
// dwarfs or the wires between them, it is wrong however pretty it looks.
const NEBULA_CAP = 0.14;          // the most of it that may ever be seen
const NEBULA_CLOUDS = [
  { at: 0.00, out: 0.52, size: 0.62, drift: 0.0071, hue: '86, 64, 178' },
  { at: 1.94, out: 0.74, size: 0.48, drift: -0.0053, hue: '46, 88, 166' },
  { at: 3.51, out: 0.40, size: 0.70, drift: 0.0039, hue: '112, 52, 156' },
  { at: 5.02, out: 0.86, size: 0.44, drift: -0.0067, hue: '38, 104, 150' },
  { at: 2.71, out: 0.62, size: 0.56, drift: 0.0045, hue: '68, 58, 170' },
];

export function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}
export function hexMix(hex, other, amount) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const ch = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((shift) => ch(shift).toString(16).padStart(2, '0')).join('')}`;
}

// ---- One scene.
//
// Everything below closes over `nostromo`, the scene: the room's page hands its own object, with
// its canvas and its DOM beside the state; the Macroverso hands one scene per NOSTROMO it draws
// live. Nothing here reads the page.

// ---- NEURAL MODE (1.0.3) ---------------------------------------------------------------------
// The same scene drawn as the neurons of a brain: every memory a point of light in its kind's
// colour, the wires between them thin axons in one cold stroke, and light only where something
// travels — a pulse lights the path it runs and the neuron it reaches. The core is the central
// bulb of that brain: cells packed into a body with a short stem, tied to their nearest, beating.
// It shows everything the full drawing shows and costs a fraction of it: no surface is shaded
// pixel by pixel, no nebula, no stars; every glow is one small texture made once and stamped.
export const NEURAL_AXON = '86, 200, 255';
export const NEURAL_IGNITION = 1.9;   // seconds the light takes to run out from the core when the mode comes on
export const NEURAL_CROSSFADE = 0.55; // seconds the drawing it replaces takes to fade out
const NEURON_GLOWS = new Map();
// A point of light of one colour: white at its heart, its colour round that, gone at its edge.
export function neuronGlow(hex) {
  let canvas = NEURON_GLOWS.get(hex);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const paint = canvas.getContext('2d');
  const glow = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glow.addColorStop(0.1, hexAlpha(hexMix(hex, '#ffffff', 0.5), 0.95));
  glow.addColorStop(0.24, hexAlpha(hex, 0.55));
  glow.addColorStop(0.5, hexAlpha(hex, 0.14));
  glow.addColorStop(1, hexAlpha(hex, 0));
  paint.fillStyle = glow;
  paint.fillRect(0, 0, 64, 64);
  NEURON_GLOWS.set(hex, canvas);
  return canvas;
}
// A NEURON, after the photographs (2026-10-27, second pass): a cell body with volume, lit from
// above and to the left, its nucleus showing through; dendrites that leave it thick and branch,
// tapering, into a tree; one axon wrapped in a beaded sheath that ends in a few terminals, a warm
// spark at some tips. Every fibre is a tube: a dark edge, its colour, a highlight on the side the
// light comes from. Drawn once per colour and shape and stamped; the light never turns, so the
// cells are not turned either, and six shapes keep them from repeating.
const NEURON_SPRITES = new Map();
export const NEURON_SPRITE = 224;      // the sprite's side; the soma's radius is a twelfth of it
export const NEURON_SHAPES = 6;
const NEURON_LIGHT = { x: -0.6, y: -0.8 };   // where the light comes from, the same for every cell
const NEURON_SPARK = '#ffb45c';              // the warm spark at a synapse, as in the photographs
// The shape of one neuron, as segments: where it is, how wide at each end, and which are the axon.
export function neuronSkeleton(rnd, c, r, reach, { depth = 3, thin = 0.4, trunks = 4 + Math.floor(rnd() * 3) } = {}) {
  const segs = [];
  const tips = [];
  const knots = [];
  // The rig (2026-10-28): each trunk is a piece, and each branch that leaves a trunk is a piece hung
  // from it, so the drawing can sway them on their roots (neuronRig, drawNeuronRig). `part` says
  // which piece a fibre, a fork or a tip belongs to; the shapes are the same as without it.
  const parts = [];
  const axon = rnd() * Math.PI * 2;
  // `z` is how near the branch stands: one further back is thinner and fainter, which is most of
  // what makes the cell read as a body in space rather than a drawing on the page.
  const grow = (x, y, a, w, length, level, z = 1, part = -1, rig = 0) => {
    const steps = 8;
    const bend = (rnd() - 0.5) * 0.2;
    for (let step = 0; step < steps; step += 1) {
      a += bend + (rnd() - 0.5) * 0.46;
      const nx = x + Math.cos(a) * (length / steps), ny = y + Math.sin(a) * (length / steps);
      const w1 = Math.max(thin, w * (1 - 0.4 * ((step + 1) / steps)));
      // Now and then the fibre swells a little, the beads a living dendrite carries.
      const bead = step > 1 && step < steps - 1 && rnd() < 0.09;
      segs.push({ x0: x, y0: y, x1: nx, y1: ny, w0: Math.max(thin, w * (1 - 0.4 * (step / steps))), w1, sheath: false, z, bead, part });
      x = nx; y = ny;
    }
    w = Math.max(thin, w * 0.6);
    if (level <= 0 || w <= thin) { tips.push({ x, y, spark: rnd() < 0.3, z, part }); return; }
    // Where it forks the fibre pools a little, as a fluid does at a joint: the web between branches.
    knots.push({ x, y, w: w * 1.5, z, part });
    const kids = rnd() < 0.3 ? 3 : 2;
    for (let k = 0; k < kids; k += 1) {
      // A branch leaving a trunk is a piece of its own, hung where it leaves.
      const own = rig === 0 && part >= 0 ? parts.push({ x, y, parent: part, kind: 'branch' }) - 1 : part;
      grow(x, y, a + (k - (kids - 1) / 2) * (0.5 + rnd() * 0.45), w, length * (0.62 + rnd() * 0.2), level - 1, Math.max(0.45, z - rnd() * 0.18), own, rig + 1);
    }
  };
  const roots = [];
  for (let i = 0; i < trunks; i += 1) {
    const a = axon + 0.7 + ((i + 0.2 + rnd() * 0.6) / trunks) * (Math.PI * 2 - 1.4);
    roots.push(a);
    const z = 0.6 + rnd() * 0.4;
    const x0 = c + Math.cos(a) * r * 0.5, y0 = c + Math.sin(a) * r * 0.5;
    const trunk = parts.push({ x: x0, y: y0, parent: -1, kind: 'trunk' }) - 1;
    grow(x0, y0, a, r * (0.32 + 0.22 * z), reach * (0.26 + rnd() * 0.1), depth, z, trunk, 0);
  }
  // The axon: long, nearly straight, sheathed, then a few short terminals.
  let x = c + Math.cos(axon) * r * 0.6, y = c + Math.sin(axon) * r * 0.6, a = axon;
  const axonPart = parts.push({ x, y, parent: -1, kind: 'axon' }) - 1;
  const steps = 12;
  const length = reach * 0.78;
  for (let step = 0; step < steps; step += 1) {
    a += (rnd() - 0.5) * 0.14;
    const nx = x + Math.cos(a) * (length / steps), ny = y + Math.sin(a) * (length / steps);
    const w0 = step === 0 ? r * 0.42 : r * 0.24, w1 = r * 0.24;
    segs.push({ x0: x, y0: y, x1: nx, y1: ny, w0, w1, sheath: step > 0 && step < steps - 1, z: 1, part: axonPart });
    x = nx; y = ny;
  }
  for (let k = 0; k < 3; k += 1) grow(x, y, a + (k - 1) * 0.6, r * 0.12, reach * 0.14, 0, 1, axonPart, 2);
  roots.push(axon);
  return { c, r, segs, tips, knots, roots, axon, parts };
}
// The cell body's outline: round, swelling where its trunks leave and toward its axon.
function somaPath(paint, sk, scale = 1) {
  const { c, r } = sk;
  paint.beginPath();
  for (let i = 0; i <= 48; i += 1) {
    const th = (i / 48) * Math.PI * 2;
    let k = 1;
    for (const root of sk.roots) k += 0.38 * Math.max(0, Math.cos(th - root)) ** 6;
    const x = c + Math.cos(th) * r * k * scale, y = c + Math.sin(th) * r * k * scale;
    if (i) paint.lineTo(x, y); else paint.moveTo(x, y);
  }
  paint.closePath();
}
// One fibre as a tube, in passes so each lies over the last: a glow round it, a dark edge, its
// colour, and a highlight on the side the light comes from. Each pass is laid down solid on a layer
// and the layer goes on at the pass's strength, so a fibre is one continuous piece of gel: no
// seams where its pieces overlap, and two branches crossing merge instead of doubling. A branch
// further back is the colour sunk toward the dark rather than see-through.
let neuronLayer = null;
function tubePass(paint, sk, colour, alpha, widen, toward = 0, add = 0) {
  const size = paint.canvas;
  neuronLayer ??= document.createElement('canvas');
  if (neuronLayer.width !== size.width || neuronLayer.height !== size.height) { neuronLayer.width = size.width; neuronLayer.height = size.height; }
  const layer = neuronLayer.getContext('2d');
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, size.width, size.height);
  layer.setTransform(paint.getTransform());
  layer.lineCap = 'round';
  const sunk = (z) => hexMix(colour, '#050a14', (1 - z) * 0.55);
  for (const seg of sk.segs) {
    const dx = seg.x1 - seg.x0, dy = seg.y1 - seg.y0;
    const d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (nx * NEURON_LIGHT.x + ny * NEURON_LIGHT.y < 0) { nx = -nx; ny = -ny; }
    const w = (seg.w0 + seg.w1) / 2 * (seg.sheath ? 1.25 : seg.bead ? 1.7 : 1);
    const off = toward * w;
    layer.strokeStyle = sunk(seg.z);
    layer.lineWidth = Math.max(0.35, w * widen + add);
    layer.beginPath();
    layer.moveTo(seg.x0 + nx * off, seg.y0 + ny * off);
    layer.lineTo(seg.x1 + nx * off, seg.y1 + ny * off);
    layer.stroke();
  }
  for (const knot of sk.knots ?? []) {
    layer.fillStyle = sunk(knot.z);
    layer.beginPath();
    layer.arc(knot.x + NEURON_LIGHT.x * toward * knot.w, knot.y + NEURON_LIGHT.y * toward * knot.w, Math.max(0.35, knot.w * widen + add) / 2, 0, Math.PI * 2);
    layer.fill();
  }
  paint.save();
  paint.setTransform(1, 0, 0, 1, 0, 0);
  paint.globalAlpha = alpha;
  paint.drawImage(neuronLayer, 0, 0);
  paint.restore();
}
// A living neuron. `life` runs from a cell going out (grey, no glow, no sparks) to one the room
// leans on (its colour, its halo, its sparks). Its body and its fibres can be drawn apart (`body`,
// `fibres`), so the rig lays each piece on a sheet of its own (neuronRig).
// Its texture, after the photographs (2026-10-28): a membrane you half see through, spines along
// the thin dendrites, vesicles caught in the light, and the body grained with what fills it.
const cellGrain = (x, y, k = 0) => (((Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453) % 1) + 1) % 1;
export function drawLivingNeuron(paint, sk, hex, life = 1, { body = true, fibres = true } = {}) {
  const tone = hexMix(hex, '#3b4250', (1 - life) * 0.72);
  const pale = hexMix(tone, '#ffffff', 0.55);
  const deep = hexMix(tone, '#050a14', 0.62);
  paint.lineCap = 'round';
  paint.lineJoin = 'round';
  paint.globalCompositeOperation = 'lighter';
  // A faint haze round the fibres and the body, no more: the cell is the subject, not its light.
  if (fibres) tubePass(paint, sk, tone, 0.03 * life, 2.6, 0, 1);
  if (body) {
    const halo = paint.createRadialGradient(sk.c, sk.c, sk.r * 0.8, sk.c, sk.c, sk.r * 2.6);
    halo.addColorStop(0, hexAlpha(tone, 0.12 * life)); halo.addColorStop(1, hexAlpha(tone, 0));
    paint.fillStyle = halo;
    paint.beginPath(); paint.arc(sk.c, sk.c, sk.r * 2.6, 0, Math.PI * 2); paint.fill();
  }
  paint.globalCompositeOperation = 'source-over';
  if (fibres) {
    // Viscous, not wired: a soft edge, a body of colour you can half see through, a wet highlight
    // along the side the light comes from, and light carried inside it.
    tubePass(paint, sk, deep, 0.55, 1.15);
    tubePass(paint, sk, tone, 0.72, 0.82, -0.06);
    paint.globalCompositeOperation = 'lighter';
    tubePass(paint, sk, pale, 0.12 + 0.1 * life, 0.5, 0);
    paint.globalCompositeOperation = 'source-over';
    tubePass(paint, sk, pale, 0.45 + 0.25 * life, 0.26, 0.24);
    // The sheath's beads: a pale ring between each, the way the photographs show the axon in segments.
    paint.strokeStyle = hexAlpha(deep, 0.85);
    for (const seg of sk.segs) if (seg.sheath) {
      const dx = seg.x1 - seg.x0, dy = seg.y1 - seg.y0;
      const d = Math.hypot(dx, dy) || 1;
      const w = seg.w0 * 1.25;
      paint.lineWidth = Math.max(0.4, w * 0.16);
      paint.beginPath(); paint.moveTo(seg.x1 + (dy / d) * w * 0.55, seg.y1 - (dx / d) * w * 0.55); paint.lineTo(seg.x1 - (dy / d) * w * 0.55, seg.y1 + (dx / d) * w * 0.55); paint.stroke();
    }
    // Spines along the thin dendrites: short stalks with a head, where the synapses land.
    for (const seg of sk.segs) {
      if (seg.sheath || seg.w0 > sk.r * 0.24 || cellGrain(seg.x0, seg.y0, 1) > 0.42) continue;
      const dx = seg.x1 - seg.x0, dy = seg.y1 - seg.y0;
      const d = Math.hypot(dx, dy) || 1;
      const side = cellGrain(seg.x0, seg.y0, 2) < 0.5 ? 1 : -1;
      const u = 0.3 + 0.4 * cellGrain(seg.x0, seg.y0, 3);
      const w = Math.max(0.35, (seg.w0 + seg.w1) / 2);
      const mx = seg.x0 + dx * u, my = seg.y0 + dy * u;
      const len = w * 1.4 + sk.r * 0.08;
      const ex = mx + (-dy / d) * side * len, ey = my + (dx / d) * side * len;
      paint.globalAlpha = (seg.z ?? 1) ** 1.5;
      paint.strokeStyle = hexAlpha(tone, 0.8);
      paint.lineWidth = Math.max(0.3, w * 0.4);
      paint.beginPath(); paint.moveTo(mx, my); paint.lineTo(ex, ey); paint.stroke();
      paint.fillStyle = hexAlpha(hexMix(tone, '#ffffff', 0.3), 0.85);
      paint.beginPath(); paint.arc(ex, ey, Math.max(0.35, w * 0.55), 0, Math.PI * 2); paint.fill();
    }
    paint.globalAlpha = 1;
    // Vesicles caught in the light, a few along each fibre.
    paint.globalCompositeOperation = 'lighter';
    for (const seg of sk.segs) {
      if (cellGrain(seg.x1, seg.y1, 4) > 0.3) continue;
      const u = cellGrain(seg.x1, seg.y1, 5);
      const w = (seg.w0 + seg.w1) / 2;
      paint.fillStyle = hexAlpha(pale, (0.25 + 0.3 * life) * ((seg.z ?? 1) ** 1.5));
      paint.beginPath(); paint.arc(seg.x0 + (seg.x1 - seg.x0) * u, seg.y0 + (seg.y1 - seg.y0) * u, Math.max(0.3, w * 0.22), 0, Math.PI * 2); paint.fill();
    }
    paint.globalCompositeOperation = 'source-over';
  }
  const { c, r } = sk;
  const lx = c + NEURON_LIGHT.x * r * 0.42, ly = c + NEURON_LIGHT.y * r * 0.42;
  if (body) {
    // The body: light at its upper left, its colour, dark toward its far edge, and a rim the light
    // behind it catches; the nucleus shows through, and what fills it gives it grain.
    const fill = paint.createRadialGradient(lx, ly, 0, c, c, r * 1.55);
    fill.addColorStop(0, hexAlpha(hexMix(tone, '#ffffff', 0.7), 0.95));
    fill.addColorStop(0.3, hexAlpha(hexMix(tone, '#ffffff', 0.2), 0.88));
    fill.addColorStop(0.7, hexAlpha(tone, 0.8));
    fill.addColorStop(1, hexAlpha(deep, 0.85));
    paint.fillStyle = fill;
    somaPath(paint, sk); paint.fill();
    paint.save();
    somaPath(paint, sk); paint.clip();
    const nucleus = paint.createRadialGradient(c + r * 0.12, c + r * 0.1, 0, c + r * 0.12, c + r * 0.1, r * 0.46);
    nucleus.addColorStop(0, hexAlpha(deep, 0.42)); nucleus.addColorStop(0.75, hexAlpha(deep, 0.22)); nucleus.addColorStop(1, hexAlpha(deep, 0));
    paint.fillStyle = nucleus;
    paint.beginPath(); paint.arc(c + r * 0.12, c + r * 0.1, r * 0.46, 0, Math.PI * 2); paint.fill();
    paint.fillStyle = hexAlpha(pale, 0.5 * life);
    paint.beginPath(); paint.arc(c + r * 0.2, c + r * 0.16, r * 0.1, 0, Math.PI * 2); paint.fill();
    // Its grain: dark granules and pale ones, scattered through it.
    for (let i = 0; i < 64; i += 1) {
      const a = cellGrain(i, c, 6) * Math.PI * 2, k = Math.sqrt(cellGrain(i, r, 7)) * r * 1.15;
      const dark = cellGrain(i, c, 8) < 0.55;
      paint.fillStyle = dark ? hexAlpha(deep, 0.2) : hexAlpha(pale, 0.22 * (0.5 + life));
      paint.beginPath(); paint.arc(c + Math.cos(a) * k, c + Math.sin(a) * k, r * (dark ? 0.05 + 0.05 * cellGrain(i, 1, 9) : 0.03 + 0.03 * cellGrain(i, 2, 9)), 0, Math.PI * 2); paint.fill();
    }
    paint.globalCompositeOperation = 'lighter';
    const rim = paint.createRadialGradient(c - NEURON_LIGHT.x * r * 0.5, c - NEURON_LIGHT.y * r * 0.5, r * 0.55, c, c, r * 1.5);
    rim.addColorStop(0, hexAlpha(tone, 0)); rim.addColorStop(0.75, hexAlpha(tone, 0)); rim.addColorStop(1, hexAlpha(pale, 0.25 * life + 0.06));
    paint.fillStyle = rim;
    paint.fillRect(c - r * 2, c - r * 2, r * 4, r * 4);
    paint.restore();
    // The shine.
    paint.globalCompositeOperation = 'lighter';
    const shine = paint.createRadialGradient(lx, ly, 0, lx, ly, r * 0.32);
    shine.addColorStop(0, `rgba(255, 255, 255, ${0.25 + 0.35 * life})`); shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    paint.fillStyle = shine;
    paint.beginPath(); paint.arc(lx, ly, r * 0.32, 0, Math.PI * 2); paint.fill();
  }
  // And the sparks at its tips.
  paint.globalCompositeOperation = 'lighter';
  if (fibres && life > 0.2) for (const tip of sk.tips) if (tip.spark) {
    const s = sk.r * 0.2 * tip.z;
    const spark = paint.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, s);
    spark.addColorStop(0, hexAlpha('#fff3dc', 0.75 * life)); spark.addColorStop(0.35, hexAlpha(NEURON_SPARK, 0.45 * life)); spark.addColorStop(1, hexAlpha(NEURON_SPARK, 0));
    paint.fillStyle = spark;
    paint.beginPath(); paint.arc(tip.x, tip.y, s, 0, Math.PI * 2); paint.fill();
  }
  paint.globalCompositeOperation = 'source-over';
}
// A dead neuron, for a claim the room found false: no body left, only its shape in loose points
// tied by a fine net, gaps where it has come apart, as in the third photograph.
export function drawDeadNeuron(paint, sk, hex, rnd, { step = 3.2, dot = 1 } = {}) {
  const points = [];
  const net = hexMix(hex, '#3d5bff', 0.55);
  for (const seg of sk.segs) {
    const d = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0);
    const n = Math.max(1, Math.round(d / step));
    for (let i = 0; i < n; i += 1) {
      if (rnd() < 0.18) continue;
      const u = (i + rnd()) / n;
      const w = (seg.w0 + (seg.w1 - seg.w0) * u) * 0.7;
      points.push({ x: seg.x0 + (seg.x1 - seg.x0) * u + (rnd() - 0.5) * w * 2, y: seg.y0 + (seg.y1 - seg.y0) * u + (rnd() - 0.5) * w * 2, s: (0.45 + rnd() * (seg.w0 > sk.r * 0.3 ? 1.3 : 0.7)) * dot });
    }
  }
  const body = Math.round(sk.r * sk.r * 0.5 / (step * 0.6));
  for (let i = 0; i < body; i += 1) {
    const a = i * 2.39996, k = Math.sqrt((i + 0.5) / body);
    points.push({ x: sk.c + Math.cos(a) * sk.r * 1.1 * k + (rnd() - 0.5) * 1.5, y: sk.c + Math.sin(a) * sk.r * 1.1 * k + (rnd() - 0.5) * 1.5, s: (0.6 + rnd() * 1.4) * dot });
  }
  paint.globalCompositeOperation = 'lighter';
  paint.lineWidth = 0.5 * dot;
  paint.strokeStyle = hexAlpha(net, 0.5);
  paint.beginPath();
  const reach = (step * 2.6) ** 2;
  for (let i = 0; i < points.length; i += 1) {
    let tied = 0;
    for (let j = i + 1; j < points.length && tied < 3; j += 1) {
      const dx = points[j].x - points[i].x, dy = points[j].y - points[i].y;
      if (dx * dx + dy * dy < reach) { paint.moveTo(points[i].x, points[i].y); paint.lineTo(points[j].x, points[j].y); tied += 1; }
    }
  }
  paint.stroke();
  for (const point of points) {
    paint.fillStyle = hexAlpha(hexMix(hex, '#ffe6ff', rnd() * 0.6), 0.85);
    paint.beginPath(); paint.arc(point.x, point.y, point.s, 0, Math.PI * 2); paint.fill();
  }
  paint.globalCompositeOperation = 'source-over';
}
// The sprite of one neuron: its colour, its shape, whether it lives, is going out or is dead, and
// how alive (`life`, one of NEURON_LIVES: its colour baked in, so a neuron is one stamp, not two).
// Seen small, or with motion reduced, this whole still drawing is what the map stamps.
const neuronShape = (variant) => { let seed = (variant + 1) * 9301 + 49297; return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; };
const neuronSkeletonOf = (variant) => { const rnd = neuronShape(variant); return { rnd, sk: neuronSkeleton(rnd, NEURON_SPRITE / 2, NEURON_SPRITE / 12, NEURON_SPRITE * 0.47, { depth: 4, thin: 0.35 }) }; };
export const NEURON_LIVES = [0.15, 0.55, 1];
export const neuronLife = (life) => NEURON_LIVES[life < 0.35 ? 0 : life < 0.7 ? 1 : 2];
export function neuronSprite(hex, variant = 0, state = 'alive', life = state === 'spent' ? 0 : 1) {
  const key = `${hex}:${variant}:${state}:${life}`;
  let canvas = NEURON_SPRITES.get(key);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = NEURON_SPRITE;
  canvas.height = NEURON_SPRITE;
  const paint = canvas.getContext('2d');
  const { rnd, sk } = neuronSkeletonOf(variant);
  if (state === 'dead') drawDeadNeuron(paint, sk, hex, rnd);
  else drawLivingNeuron(paint, sk, hex, life);
  NEURON_SPRITES.set(key, canvas);
  return canvas;
}
// THE RIG (2026-10-28): the same neuron cut into pieces — each trunk, each branch that leaves a
// trunk, the axon, the body — laid side by side on one sheet, each with the point it hangs from.
// The map stamps the pieces turned a little on their roots, each to its own slow rhythm, so the
// dendrites move as living tissue does; the body stays, drawn last, over where they leave it.
const NEURON_RIGS = new Map();
const RIG_SCALE = 0.75;   // the sheet's pixels per unit of the sprite: a rig is seen near, not huge
export function neuronRig(hex, variant = 0, life = 1) {
  const key = `${hex}:${variant}:${life}`;
  let rig = NEURON_RIGS.get(key);
  if (rig) return rig;
  const { sk } = neuronSkeletonOf(variant);
  const pad = sk.r * 0.3 + 3;
  const reachOf = (w) => w * 1.6 + 1.5;
  const pieces = sk.parts.map((part, index) => ({ index, part, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }));
  const grow = (piece, x, y, w) => { piece.x0 = Math.min(piece.x0, x - w); piece.y0 = Math.min(piece.y0, y - w); piece.x1 = Math.max(piece.x1, x + w); piece.y1 = Math.max(piece.y1, y + w); };
  for (const seg of sk.segs) { const piece = pieces[seg.part]; if (!piece) continue; const w = reachOf(Math.max(seg.w0, seg.w1) * 1.7); grow(piece, seg.x0, seg.y0, w); grow(piece, seg.x1, seg.y1, w); }
  for (const knot of sk.knots) { const piece = pieces[knot.part]; if (piece) grow(piece, knot.x, knot.y, reachOf(knot.w)); }
  for (const tip of sk.tips) { const piece = pieces[tip.part]; if (piece) grow(piece, tip.x, tip.y, sk.r * 0.22 + 1); }
  const body = { index: -1, part: null, x0: sk.c - sk.r * 2.7, y0: sk.c - sk.r * 2.7, x1: sk.c + sk.r * 2.7, y1: sk.c + sk.r * 2.7 };
  const all = [...pieces.filter((piece) => Number.isFinite(piece.x0)), body];
  // On the sheet, shelf by shelf.
  const width = Math.ceil(NEURON_SPRITE * 2.2 * RIG_SCALE);
  let x = 0, y = 0, row = 0;
  for (const piece of all) {
    piece.x0 -= pad; piece.y0 -= pad; piece.x1 += pad; piece.y1 += pad;
    piece.w = Math.ceil((piece.x1 - piece.x0) * RIG_SCALE);
    piece.h = Math.ceil((piece.y1 - piece.y0) * RIG_SCALE);
    if (x + piece.w > width) { x = 0; y += row; row = 0; }
    piece.sx = x; piece.sy = y;
    x += piece.w;
    row = Math.max(row, piece.h);
  }
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = Math.max(1, y + row);
  const paint = sheet.getContext('2d');
  for (const piece of all) {
    paint.setTransform(RIG_SCALE, 0, 0, RIG_SCALE, piece.sx - piece.x0 * RIG_SCALE, piece.sy - piece.y0 * RIG_SCALE);
    paint.save();
    paint.beginPath(); paint.rect(piece.x0, piece.y0, piece.x1 - piece.x0, piece.y1 - piece.y0); paint.clip();
    if (piece.part) {
      const own = (one) => one.part === piece.index;
      drawLivingNeuron(paint, { ...sk, segs: sk.segs.filter(own), knots: sk.knots.filter(own), tips: sk.tips.filter(own) }, hex, life, { body: false });
    } else drawLivingNeuron(paint, sk, hex, life, { fibres: false });
    paint.restore();
  }
  paint.setTransform(1, 0, 0, 1, 0, 0);
  const trunks = all.filter((piece) => piece.part && piece.part.parent < 0);
  for (const trunk of trunks) trunk.kids = all.filter((piece) => piece.part && piece.part.parent === trunk.index);
  rig = { sheet, trunks, body };
  NEURON_RIGS.set(key, rig);
  return rig;
}
// How far a piece is turned at `t`: a trunk a little, a branch more, the axon hardly; two slow waves
// of its own each, so no two pieces and no two neurons move together.
function rigSway(t, seed, index, kind) {
  const reach = kind === 'axon' ? 0.035 : kind === 'trunk' ? 0.1 : 0.22;
  const pace = 0.5 + (((seed * 7.13 + index * 0.37) % 1) + 1) % 1 * 0.4;
  return reach * (0.72 * Math.sin(pace * t + seed * 3 + index * 1.9) + 0.28 * Math.sin(pace * 0.53 * t + index * 2.7 + seed));
}
export function drawNeuronRig(ctx, rig, x, y, side, t, seed) {
  const k = side / NEURON_SPRITE;
  const stamp = (piece) => ctx.drawImage(rig.sheet, piece.sx, piece.sy, piece.w, piece.h, piece.x0, piece.y0, piece.w / RIG_SCALE, piece.h / RIG_SCALE);
  const hang = (piece, turn, inner) => {
    ctx.save();
    ctx.translate(piece.part.x, piece.part.y);
    ctx.rotate(turn);
    ctx.translate(-piece.part.x, -piece.part.y);
    stamp(piece);
    inner?.();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-NEURON_SPRITE / 2, -NEURON_SPRITE / 2);
  for (const trunk of rig.trunks) {
    hang(trunk, rigSway(t, seed, trunk.index, trunk.part.kind), () => {
      for (const kid of trunk.kids) hang(kid, rigSway(t, seed, kid.index, 'branch'));
    });
  }
  stamp(rig.body);
  ctx.restore();
}
// The neural mode's palette (2026-10-28): the photographs' own — the pale, see-through blue of a
// living cell, its warm amber where light catches it, a sea green, a lavender —, membranes rather
// than paint, one per kind so the legend still tells them apart; the dead one keeps its violet.
export const NEURAL_COLORS = { decision: '#f0b47c', fact: '#9fd2ea', preference: '#8fd8c0', question: '#b7a8f2', aberration: '#cf74f0' };
// A memory's kind as a whole neuron for the legend, drawn for its size: fewer branches, thicker,
// the same light. `state` is alive, spent (not used) or dead (doubtful).
export function neuronChip(hex, size = 16, state = 'alive') {
  const canvas = document.createElement('canvas');
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const paint = canvas.getContext('2d');
  paint.scale(canvas.width / 64, canvas.height / 64);
  let seed = 4 * 9301 + 49297;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const sk = neuronSkeleton(rnd, 32, 8, 31, { depth: 1, thin: 1.6, trunks: 4 });
  if (state === 'dead') drawDeadNeuron(paint, sk, hex, rnd, { step: 4.5, dot: 1.6 });
  else drawLivingNeuron(paint, sk, hex, state === 'spent' ? 0 : 1);
  return canvas;
}
// A bundle of fibres from (x0, y0) to (x1, y1) bent through (cx, cy): a few strands that leave
// together, part a little in the middle and meet again, the way an axon tract runs. Stroked
// into the current path; the caller strokes it.
export function fibreBundle(ctx, x0, y0, cx, cy, x1, y1, { strands = 3, spread = 3, seed = 0 } = {}) {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  for (let i = 0; i < strands; i += 1) {
    const k = strands === 1 ? 0 : (i / (strands - 1)) * 2 - 1;
    const wobble = Math.sin(seed * 3.1 + i * 1.7) * spread * 0.6;
    const off = k * spread + wobble;
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + (cx - x0) * 0.66 + nx * off, y0 + (cy - y0) * 0.66 + ny * off, x1 + (cx - x1) * 0.66 + nx * off * 0.8, y1 + (cy - y1) * 0.66 + ny * off * 0.8, x1, y1);
  }
}
// A synapse as living tissue (2026-10-27): one viscous tube from (x0, y0) to (x1, y1) bent through
// (cx, cy), full where it leaves each cell and drawn thin in the middle, the way two dendrites
// reach for each other, wavering a little, with the same edge, colour and wet highlight as the
// cells' own fibres. Widths are in the context's units, so it thickens as you come closer.
export function gooTube(ctx, x0, y0, cx, cy, x1, y1, { w = 2, mid = 0.35, colour = '#7cc4ff', alpha = 1, seed = 0, min = 0.4 } = {}) {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  const points = [];
  const N = 18;
  for (let i = 0; i <= N; i += 1) {
    const u = i / N;
    const p = alongCurve(x0, y0, cx, cy, x1, y1, u);
    const wob = Math.sin(u * Math.PI * 3 + seed) * Math.sin(u * Math.PI) * Math.min(14, d * 0.025);
    points.push({ x: p.x + nx * wob, y: p.y + ny * wob, w: w * (1 - (1 - mid) * Math.sin(u * Math.PI)) });
  }
  // Each pass is one filled outline — its two edges walked out along the normals, its ends inside
  // the cells — so the tube is a single piece with no seams.
  for (const [tint, a, k, toward] of [[hexMix(colour, '#050a14', 0.62), 0.5, 1.15, 0], [colour, 0.62, 0.8, -0.06], [hexMix(colour, '#ffffff', 0.55), 0.42, 0.26, 0.24]]) {
    const left = [], right = [];
    for (let i = 0; i <= N; i += 1) {
      const p = points[Math.max(0, i - 1)], q = points[Math.min(N, i + 1)];
      const sx = q.x - p.x, sy = q.y - p.y;
      const sd = Math.hypot(sx, sy) || 1;
      let ox = -sy / sd, oy = sx / sd;
      if (ox * NEURON_LIGHT.x + oy * NEURON_LIGHT.y < 0) { ox = -ox; oy = -oy; }
      const half = Math.max(min, points[i].w * k) / 2;
      const cx0 = points[i].x + ox * toward * half * 2, cy0 = points[i].y + oy * toward * half * 2;
      left.push([cx0 + ox * half, cy0 + oy * half]);
      right.push([cx0 - ox * half, cy0 - oy * half]);
    }
    ctx.fillStyle = hexAlpha(tint, a * alpha);
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (const [x, y] of left) ctx.lineTo(x, y);
    for (let i = N; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();
  }
}
// The bulb's cells, laid out once: a golden-angle spiral through a body a little wider above,
// most of them near its skin so its shape reads, a warm few deep inside, and a stem below.
const BULB_TONES = {
  mother: { heart: '#ffe3b8', skin: '#7fd3ff', deep: '#ffc98a', stem: '#5fc2ff', air: '255, 214, 160', haze: '90, 190, 255', alarm: '#ff4a3a' },
  bishop: { heart: '#efe6ff', skin: '#8fa6ff', deep: '#c9b4ff', stem: '#7f8cff', air: '214, 196, 255', haze: '110, 120, 255', alarm: '#ff4a3a' },
};
export const BULB = (() => {
  const cells = [];
  const noise = (i, k) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
  const body = 190;
  for (let i = 0; i < body; i += 1) {
    const along = 1 - (2 * (i + 0.5)) / body;
    const ring = Math.sqrt(Math.max(0, 1 - along * along));
    const turn = i * 2.39996;
    const deep = noise(i, 1) < 0.16;
    const out = deep ? 0.18 + 0.42 * noise(i, 2) : 0.72 + 0.28 * Math.sqrt(noise(i, 3));
    const wide = 1 + 0.14 * Math.max(0, along);
    cells.push({ x: ring * Math.cos(turn) * out * wide, y: -along * out * 0.92, z: ring * Math.sin(turn) * out * 0.88 * wide, out, tone: deep ? 'deep' : out < 0.82 ? 'heart' : 'skin' });
  }
  for (let i = 0; i < 26; i += 1) {
    const down = i / 25;
    const turn = i * 2.39996;
    const girth = 0.26 - 0.15 * down;
    cells.push({ x: 0.16 * down * down + Math.cos(turn) * girth * 0.6, y: 0.82 + 0.95 * down, z: Math.sin(turn) * girth * 0.6, out: 1, tone: 'stem' });
  }
  const links = [];
  const seen = new Set();
  cells.forEach((cell, i) => {
    const near = cells.map((other, j) => ({ j, d: (other.x - cell.x) ** 2 + (other.y - cell.y) ** 2 + (other.z - cell.z) ** 2 }))
      .filter((one) => one.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const { j } of near) { const key = i < j ? `${i}-${j}` : `${j}-${i}`; if (!seen.has(key)) { seen.add(key); links.push([i, j]); } }
  });
  // Who stands next to whom, for the sparks that run through it.
  const near = cells.map(() => []);
  for (const [i, j] of links) { near[i].push(j); near[j].push(i); }
  return { cells, links, near };
})();
// ITS ELECTRICAL ACTIVITY (2026-10-27): sparks run cell to cell inside the bulb all the time, the way
// a brain is never quiet — a few at once, each a short path along its fibres that lights as it
// goes and fades behind. Read from the time alone: no state, the same frame for the same instant.
const SPARK_SLOTS = 7;
const sparkNoise = (a, b) => (((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1) + 1) % 1;
function bulbSparks(t, count = SPARK_SLOTS) {
  const out = [];
  for (let k = 0; k < count; k += 1) {
    const period = 0.85 + k * 0.17;
    const shifted = t + k * 0.41;
    const n = Math.floor(shifted / period);
    const phase = (shifted - n * period) / period;
    let cell = Math.floor(sparkNoise(k + 1, n) * BULB.cells.length);
    const path = [cell];
    const steps = 4 + Math.floor(sparkNoise(n, k + 7) * 5);
    for (let i = 0; i < steps; i += 1) {
      const options = BULB.near[cell].filter((one) => !path.includes(one));
      if (!options.length) break;
      cell = options[Math.floor(sparkNoise(n * 13 + i, k) * options.length)];
      path.push(cell);
    }
    out.push({ path, phase });
  }
  return out;
}
// The bulb, drawn at (x, y) with radius R in whatever space the context is in; `px` is one css
// pixel in that space. It turns slowly on its own besides the scene's turn, beats with the heart,
// answers when pulses come home (`lit`), flushes red in an alarm, and flashes as the mode comes on.
export function drawNeuralBulb(ctx, x, y, R, t, { yaw = 0, pitch = 0, beat = 0, lit = 0, alarm = 0, px = 1, light = 1, ignite = 1, tone = 'mother', still = false } = {}) {
  const colours = BULB_TONES[tone] ?? BULB_TONES.mother;
  const turn = yaw + (still ? 0 : t * 0.07);
  // Turned exactly as the memories are (2026-10-27), so the body and what it holds are one thing in space.
  const cy = Math.cos(turn), sy = Math.sin(turn), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const flash = ignite < 0.3 ? 1 - ignite / 0.3 : 0;
  const energy = Math.min(1.6, (0.62 + 0.38 * beat + 0.45 * Math.min(1, lit) + 1.2 * flash) * light);
  const reach = R * 1.12;
  const at = BULB.cells.map((cell) => {
    const x1 = cell.x * cy + cell.z * sy;
    const z1 = cell.z * cy - cell.x * sy;
    const y2 = cell.y * cp - z1 * sp;
    const z2 = cell.y * sp + z1 * cp;
    return { x: x + x1 * reach, y: y + y2 * reach, front: (z2 + 1) / 2, cell };
  });
  const before = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  // Its air: warm at the heart, cold at the edge, breathing with the beat.
  const air = ctx.createRadialGradient(x, y, 0, x, y, R * 2.5);
  air.addColorStop(0, `rgba(${alarm ? '255, 90, 70' : colours.air}, ${0.3 * energy})`);
  air.addColorStop(0.32, `rgba(${colours.haze}, ${0.1 * energy})`);
  air.addColorStop(1, `rgba(${colours.haze}, 0)`);
  ctx.fillStyle = air;
  ctx.beginPath(); ctx.arc(x, y, R * 2.5, 0, Math.PI * 2); ctx.fill();
  // The fibres between neighbouring cells, in one stroke.
  ctx.strokeStyle = `rgba(${colours.haze}, ${Math.min(0.5, 0.2 * energy)})`;
  ctx.lineWidth = 0.6 * px;
  ctx.beginPath();
  for (const [i, j] of BULB.links) { ctx.moveTo(at[i].x, at[i].y); ctx.lineTo(at[j].x, at[j].y); }
  ctx.stroke();
  // Its electrical activity: each spark's head running along its path, the stretch behind it fading,
  // and the cell it reaches flaring.
  if (!still) {
    ctx.lineCap = 'round';
    for (const spark of bulbSparks(t)) {
      const reach = spark.phase * 1.35 * (spark.path.length - 1);
      for (let i = 0; i < spark.path.length - 1; i += 1) {
        const age = reach - i;
        if (age < 0 || age > 2.6) continue;
        const a = at[spark.path[i]], b = at[spark.path[i + 1]];
        const part = Math.min(1, age);
        const fade = Math.max(0, 1 - Math.max(0, age - 1) / 1.6);
        // Broken, as a discharge is: the segment bends at two points that shake each frame.
        const ex = a.x + (b.x - a.x) * part, ey = a.y + (b.y - a.y) * part;
        const nx = -(ey - a.y), ny = ex - a.x;
        const jag = (k) => (sparkNoise(t * 60 + i, k) - 0.5) * 0.35;
        const p1 = { x: a.x + (ex - a.x) * 0.33 + nx * jag(1), y: a.y + (ey - a.y) * 0.33 + ny * jag(1) };
        const p2 = { x: a.x + (ex - a.x) * 0.66 + nx * jag(2), y: a.y + (ey - a.y) * 0.66 + ny * jag(2) };
        const tone = alarm ? '255, 120, 100' : '170, 225, 255';
        ctx.strokeStyle = `rgba(${tone}, ${0.22 * fade * light})`;
        ctx.lineWidth = (4 * fade + 1) * px;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = alarm ? `rgba(255, 190, 180, ${0.85 * fade * light})` : `rgba(230, 246, 255, ${0.85 * fade * light})`;
        ctx.lineWidth = (1 * fade + 0.3) * px;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(ex, ey); ctx.stroke();
        if (age >= 1 && age < 1.5) {
          const flare = (1.5 - age) * 2;
          const size = 7 * flare * px;
          ctx.globalAlpha = Math.min(1, 0.9 * flare * light);
          ctx.drawImage(neuronGlow(alarm ? colours.alarm : '#d8f1ff'), b.x - size, b.y - size, size * 2, size * 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  // The cells, the near side brighter, the heart swelling on the beat.
  for (const point of at) {
    const inner = 1 - point.cell.out;
    const size = (3 + 2.6 * point.front + 2.4 * inner * beat) * px * (1 + 0.6 * flash);
    const hex = alarm ? colours.alarm : colours[point.cell.tone];
    ctx.globalAlpha = Math.min(1, (0.3 + 0.55 * point.front) * energy);
    ctx.drawImage(neuronGlow(hex), point.x - size, point.y - size, size * 2, size * 2);
  }
  // The nucleus: one wide soft light at the centre.
  const heart = R * (0.5 + 0.06 * beat + 0.4 * flash);
  ctx.globalAlpha = Math.min(1, (0.55 + 0.35 * beat) * energy);
  ctx.drawImage(neuronGlow(alarm ? colours.alarm : colours.heart), x - heart, y - heart, heart * 2, heart * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = before;
}
// The ground the neurons stand on: almost black, a cold depth at the middle.
export function neuralGround(ctx, w, h, beat = 0) {
  ctx.fillStyle = '#010309';
  ctx.fillRect(0, 0, w, h);
  const depth = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.72);
  depth.addColorStop(0, `rgba(16, 52, 96, ${0.42 + 0.04 * beat})`);
  depth.addColorStop(0.55, 'rgba(6, 18, 38, .3)');
  depth.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, w, h);
}

export function createNostromo(nostromo) {
  // What belongs to this scene and no other: the budget of faces painted this frame, and MOTHER's
  // painted face at its current size.
  const shading = { frame: -1, painted: 0, built: false };
  let magmaSprite = null;
  let coreSun = null;           // the star at the centre (sunOrb), painted at the size it is seen

  function beginImplosion(node, t) {
    node.forgetting = { at: t };
    node.debris = Array.from({ length: DEBRIS }, () => ({ a: Math.random() * Math.PI * 2, d: 1.4 + Math.random() * 2.8, w: 0.5 + Math.random() * 1.5, s: 0.6 + Math.random() * 0.9 }));
    const id = node.memory.id;
    const byId = new Map(nostromo.nodes.map((other) => [other.memory.id, other]));
    const dust = nostromo.dust ?? (nostromo.dust = []);
    const fading = nostromo.fading ?? (nostromo.fading = []);
    const wires = [];
    for (const link of nostromo.links) {
      if (link.a !== id && link.b !== id) continue;
      const other = byId.get(link.a === id ? link.b : link.a);
      if (!other) continue;
      wires.push({ x0: node.x, y0: node.y, cx: link.cx ?? (node.x + other.x) / 2, cy: link.cy ?? (node.y + other.y) / 2, x1: other.x, y1: other.y, from: node.color, to: other.color });
    }
    // The wire from MOTHER, too: it comes apart from the memory's end back toward her.
    if (node.rimX !== undefined) wires.push({ x0: node.x, y0: node.y, cx: node.cx ?? node.x / 2, cy: node.cy ?? node.y / 2, x1: node.rimX, y1: node.rimY, from: node.color, to: '#e22816' });
    for (const wire of wires) {
      const length = Math.hypot(wire.x1 - wire.x0, wire.y1 - wire.y0);
      const count = Math.max(8, Math.min(60, Math.round(length / 9)));
      if (dust.length < DUST_CAP) dust.push(...wireDust(wire.x0, wire.y0, wire.cx, wire.cy, wire.x1, wire.y1, wire.from, wire.to, t, count));
      fading.push({ ...wire, born: t });
    }
    nostromo.links = nostromo.links.filter((link) => link.a !== id && link.b !== id);
    nostromo.witness = node;
  }

  function drawImplosion(ctx, node, t, scale, reduced) {
    const p = Math.min(1, (t - node.forgetting.at) / IMPLOSION);
    const R0 = node.r;
    const x = node.x;
    const y = node.y;
    const px = 1 / scale;
    ctx.save();
    // The horizon: a disc of nothing that opens as the body begins to go and closes after it.
    const open = p < 0.38 ? smooth(0.06, 0.38, p) : 1 - smooth(0.5, 0.82, p);
    if (open > 0.01) {
      const hole = R0 * 0.95 * open;
      const dark = ctx.createRadialGradient(x, y, 0, x, y, hole * 1.15);
      dark.addColorStop(0, 'rgba(0, 0, 0, 1)');
      dark.addColorStop(0.82, 'rgba(0, 0, 0, .96)');
      dark.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(x, y, hole * 1.15, 0, Math.PI * 2); ctx.fill();
      // Light bent round its rim, in arcs that turn and do not quite close.
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k += 1) {
        const from = (reduced ? 0 : t * (2.4 + k * 0.7)) + k * 2.1;
        ctx.strokeStyle = k === 1 ? hexAlpha(node.color, 0.7 * open) : `rgba(214, 228, 255, ${0.55 * open})`;
        ctx.lineWidth = (1.6 - 0.35 * k) * px;
        ctx.beginPath(); ctx.arc(x, y, hole * (1.06 + 0.05 * k), from, from + 1.6 + 0.6 * Math.sin(t + k)); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    // What it was made of, falling in: faster the closer it gets, drawn out into threads.
    if (!reduced && p < 0.66) {
      const fall = Math.min(1, p / 0.62);
      const where = (bit, f) => {
        const reach = R0 * bit.d * (1 - f) ** 1.4;
        const angle = bit.a + (bit.w * f * 3.2) / (0.12 + (1 - f));
        return [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach];
      };
      ctx.lineCap = 'round';
      for (const bit of node.debris ?? []) {
        const f = Math.min(1, fall * bit.s + fall * (1 - bit.s) * fall);
        const alpha = Math.min(1, f * 7) * (1 - smooth(0.82, 1, f));
        if (alpha <= 0.01) continue;
        const [ax, ay] = where(bit, Math.max(0, f - 0.05));
        const [bx, by] = where(bit, f);
        ctx.strokeStyle = hexAlpha(hexMix(node.color, '#ffffff', f), 0.85 * alpha);
        ctx.lineWidth = (0.8 + 1.2 * f) * px;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    // The point of light as it goes, and the ring that runs out into the dark.
    const gone = p - 0.6;
    if (gone > 0 && gone < 0.2) {
      const flash = (1 - gone / 0.2) ** 2;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R0 * (0.6 + gone * 14));
      glow.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
      glow.addColorStop(0.25, hexAlpha(hexMix(node.color, '#ffffff', 0.6), 0.6 * flash));
      glow.addColorStop(1, hexAlpha(node.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, R0 * (0.6 + gone * 14), 0, Math.PI * 2); ctx.fill();
    }
    if (gone > 0) {
      const q = gone / 0.4;
      ctx.strokeStyle = `rgba(206, 222, 255, ${0.32 * (1 - q) ** 1.5})`;
      ctx.lineWidth = (1.4 * (1 - q) + 0.3) * px;
      ctx.beginPath(); ctx.arc(x, y, R0 * (1 + q * 16), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // The links coming apart: what is left of each wire, beyond the wave, and the dust behind it.
  function drawDust(ctx, t, scale) {
    const px = 1 / scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const wire of nostromo.fading ?? []) {
      const age = t - wire.born;
      const wave = Math.min(1, Math.max(0, (age - 0.15) / 0.55));
      const fade = 1 - smooth(0.5, 1.2, age);
      if (fade <= 0 || wave >= 1) continue;
      const line = ctx.createLinearGradient(wire.x0, wire.y0, wire.x1, wire.y1);
      line.addColorStop(0, hexAlpha(wire.from, 0));
      line.addColorStop(Math.min(0.999, wave + 0.001), hexAlpha(wire.from, 0));
      line.addColorStop(Math.min(1, wave + 0.06), hexAlpha(hexMix(wire.from, wire.to, wave), 0.55 * fade));
      line.addColorStop(1, hexAlpha(wire.to, 0.45 * fade));
      ctx.strokeStyle = line;
      ctx.lineWidth = 0.9 * px;
      ctx.beginPath(); ctx.moveTo(wire.x0, wire.y0); ctx.quadraticCurveTo(wire.cx, wire.cy, wire.x1, wire.y1); ctx.stroke();
    }
    for (const mote of nostromo.dust ?? []) {
      const age = t - mote.born;
      if (age < 0 || age >= mote.life) continue;
      const glint = 0.55 + 0.45 * Math.sin(t * 9 + mote.phase);
      const alpha = Math.min(1, age * 8) * (1 - age / mote.life) ** 1.5 * glint;
      if (alpha <= 0.01) continue;
      ctx.fillStyle = hexAlpha(mote.colour, Math.min(1, alpha));
      ctx.beginPath(); ctx.arc(mote.x, mote.y, mote.size * px, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSight(ctx, x, y, radius, t, scale, { locked = false, age = 1, label = '', still = false } = {}) {
    const px = 1 / scale;
    const close = locked ? 1 - (1 - Math.min(1, age / 0.35)) ** 3 : 1;
    const R = radius + 9 * px + (1 - close) * 46 * px;
    const blink = locked && age < 0.45 ? (Math.floor(age * 14) % 2 ? 0.35 : 1) : 1;
    const alpha = (locked ? 0.95 : 0.5) * blink;
    const arm = Math.max(7 * px, R * 0.34);
    ctx.save();
    ctx.lineCap = 'square';
    ctx.shadowColor = `rgba(${HUD_GREEN}, .7)`;
    ctx.shadowBlur = locked ? 6 : 3;
    ctx.strokeStyle = `rgba(${HUD_GREEN}, ${alpha})`;
    ctx.lineWidth = (locked ? 1.6 : 1.1) * px;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * R, y + sy * (R - arm));
      ctx.lineTo(x + sx * R, y + sy * R);
      ctx.lineTo(x + sx * (R - arm), y + sy * R);
    }
    ctx.stroke();
    if (locked) {
      // The broken ring, turning; and the ticks at the four bearings.
      const ring = R * 1.22;
      const spin = still ? 0 : t * 0.6;
      ctx.lineWidth = 1.1 * px;
      ctx.strokeStyle = `rgba(${HUD_GREEN}, ${0.7 * blink})`;
      for (let k = 0; k < 4; k += 1) {
        const from = spin + k * (Math.PI / 2) + 0.22;
        ctx.beginPath(); ctx.arc(x, y, ring, from, from + Math.PI / 2 - 0.44); ctx.stroke();
      }
      ctx.beginPath();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        ctx.moveTo(x + dx * ring * 1.08, y + dy * ring * 1.08);
        ctx.lineTo(x + dx * (ring * 1.08 + 9 * px), y + dy * (ring * 1.08 + 9 * px));
      }
      ctx.stroke();
      if (label) {
        ctx.shadowBlur = 0;
        ctx.font = `${10 * px}px ${getComputedStyle(nostromo.canvas).getPropertyValue('--mono') || 'monospace'}`;
        ctx.fillStyle = `rgba(${HUD_GREEN}, ${0.9 * blink})`;
        ctx.fillText(label, x + R + 6 * px, y - R + 3 * px);
      }
    }
    ctx.restore();
  }

  function focusNostromo(dt, t) {
    // A memory being forgotten keeps the stage until it is gone: the dark stays down around it.
    const witness = nostromo.witness?.forgetting && nostromo.nodes.includes(nostromo.witness) ? nostromo.witness : null;
    const held = (nostromo.selected && nostromo.nodes.includes(nostromo.selected) ? nostromo.selected : null) ?? witness;
    const lock = nostromo.lock ?? (nostromo.lock = { node: null, at: 0, fade: 0, aim: false });
    if (held && held !== lock.node) { lock.node = held; lock.at = t; lock.aim = held === nostromo.selected; }
    if (held?.forgetting) lock.aim = false;
    lock.fade += ((held ? 1 : 0) - lock.fade) * Math.min(1, 0.12 * dt);
    if (!held) { lock.aim = false; if (lock.fade < 0.01) lock.node = null; }
    if (!lock.aim || !held || held.wx === undefined) return;
    // The turn that brings this dwarf to face the eye: about the vertical axis until it sits on
    // the line of sight, then tipped until it is level with it.
    const across = Math.hypot(held.wx, held.wz) || 1;
    const yawTo = Math.atan2(-held.wx, held.wz);
    const pitchTo = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, Math.atan2(held.wy, across)));
    const yaw = nostromo.yaw ?? 0;
    const short = ((yawTo - yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    // The head turns freely now, so it may be upside down: the tip back is the short way round too.
    const tip = ((pitchTo - (nostromo.pitch ?? 0) + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const step = Math.min(1, FOCUS_TURN * dt);
    nostromo.yaw = yaw + short * step;
    nostromo.pitch = (nostromo.pitch ?? 0) + tip * step;
  }

  function projectNostromo() {
    const yaw = nostromo.yaw ?? 0;
    const pitch = nostromo.pitch ?? 0;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (const node of nostromo.nodes) {
      if (node.wx === undefined) { node.wx = node.x; node.wy = node.y; node.wz = 0; }
      node.r3 ??= node.r;
      // Turned about the vertical axis, then tipped about the horizontal one: the same order the
      // core's own longitude and lean are applied in, so the star and the body turn as one thing.
      const x1 = node.wx * cy + node.wz * sy;
      const z1 = node.wz * cy - node.wx * sy;
      const y2 = node.wy * cp - z1 * sp;
      const z2 = node.wy * sp + z1 * cp;
      const near = VIEW_DISTANCE / Math.max(200, VIEW_DISTANCE - z2);
      node.x = x1 * near;
      node.y = y2 * near;
      node.depth = z2;
      node.r = node.r3 * near;
    }
  }

  function sizeNostromo() {
    const canvas = nostromo.canvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (!rect.width || !rect.height) return false;
    nostromo.size = { w: rect.width, h: rect.height, dpr };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    placeNostromo();
    return true;
  }
  // Every memory not yet placed is given its first place on the body. Apart from the sizing, so a
  // scene whose canvas is not on the page (the Macroverso paints its sprites off screen) can be
  // sized by hand and still placed the same way.
  function placeNostromo() {
    // Spread evenly over the whole surface, so no part of the brain is bald and none is a crowd.
    // In the plane a crowd pushed itself round the ring; in a body it escapes into depth instead
    // and stays where it started, so the start has to be even already. A golden-angle spiral runs
    // from the frontal pole to the back of the head, and the memories walk it grouped by kind:
    // each kind takes a band of its own, a lobe as wide as it has memories.
    const kinds = Object.keys(MEMORY_COLORS);
    const waiting = nostromo.nodes.filter((node) => !node.placed)
      .sort((a, b) => (kinds.indexOf(a.memory.kind) - kinds.indexOf(b.memory.kind)) || (a.angle - b.angle));
    for (const [i, node] of waiting.entries()) {
      const along = 1 - (2 * (i + 0.5)) / waiting.length;
      const ring = Math.sqrt(1 - along * along);
      const turn = i * GOLDEN_ANGLE;
      let ux = -along;
      let uy = ring * Math.cos(turn);
      let uz = ring * Math.sin(turn);
      // Never on the midline, where the fissure is.
      if (Math.abs(uz) < FISSURE) { uz = Math.sign(uz || 1) * FISSURE; const fit = Math.hypot(ux, uy, uz); ux /= fit; uy /= fit; uz /= fit; }
      const radius = NOSTROMO_ORBIT * brainRadius(Math.atan2(uy, ux)) * shellDepth(node);
      node.wx = ux * radius;
      node.wy = uy * radius;
      node.wz = uz * BRAIN_WIDTH * radius;
      node.wvx = 0; node.wvy = 0; node.wvz = 0;
      node.placed = true;
    }
  }

  // The heartbeat: lub, then a softer dub, each decaying fast. 0..~1.5.
  function heartbeat(t) {
    const period = nostromo.cage ? 0.62 : nostromo.altered ? 0.82 : HEART_PERIOD;
    const phase = (t % period) / period;
    const pulse = (at) => (phase >= at ? Math.exp(-(phase - at) * 14) : 0);
    return { phase, beat: pulse(0) + 0.55 * pulse(0.22) };
  }

  // A planet's face, painted into a buffer of its own. `look` is how it is lit now: `light`, the
  // direction of the sun from it in view space; `exposure`, `fade` and `fill` as shadePlanet reads
  // them. Painted again once the middle of its face has turned half a pixel, or the light on it
  // has moved its terminator about a pixel, so a small planet is painted rarely and a large one,
  // close up, as often as it needs.
  function planetSprite(node, radius, pixels, frame, look) {
    if (typeof ImageData !== 'function') return null;
    if (shading.frame !== frame) { shading.frame = frame; shading.painted = 0; shading.built = false; }
    const kind = planetOf(node.memory.kind);
    const halo = PLANETS[kind].air ? PLANET_HALO : 1;
    // The disc is never painted wider than 200 pixels, as the stars were; beyond that it is scaled.
    const size = Math.max(8, Math.min(2 * Math.round(100 * halo), 2 * Math.round(radius * halo * pixels)));
    if (!planetMaps.get(kind)?.done) {
      if (shading.built) return null;
      shading.built = true;
      if (!planetMap(kind, PLANET_ROWS_PER_FRAME)) return null;
    }
    const map = planetMap(kind);
    let sprite = node.sprite;
    // A body that has never been painted at this size waits its turn like any other: when a whole
    // planet becomes ready at once it is introduced a few dozen a frame, not all in one.
    const tilt = node.tilt ?? 0;
    const anew = !sprite || sprite.size !== size || sprite.kind !== kind || sprite.tilt !== tilt;
    if (anew && shading.painted >= SHADE_BUDGET) return sprite?.kind === kind ? sprite.canvas : null;
    if (anew) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const paint = canvas.getContext('2d');
      if (!paint?.createImageData) return null;
      sprite = node.sprite = { canvas, paint, image: paint.createImageData(size, size), size, kind, tilt, turn: NaN, light: [0, 0, 0], exposure: -1, fade: -1, fill: -1 };
    }
    // For whoever asked for stillness a planet does not spin, and its clouds stay where they are;
    // the light on it still follows the map when they turn it by hand.
    // Each one at its own pace and in its own sense: a whole turn every 50 to 140 seconds.
    const turn = (nostromo.reduced ? 0 : (node.sense ?? 1) * (node.axisAge ?? 0) * ((Math.PI * 2) / (node.period ?? 90))) + node.seed;
    const [lx, ly, lz] = look.light;
    const moved = !(sprite.turn === sprite.turn)
      || Math.abs(turn - sprite.turn) * size > 1
      || Math.hypot(lx - sprite.light[0], ly - sprite.light[1], lz - sprite.light[2]) * size > 2
      || Math.abs(look.exposure - sprite.exposure) > 0.03
      || look.fade !== sprite.fade
      || Math.abs(look.fill - sprite.fill) > 0.04;
    if (moved && shading.painted < SHADE_BUDGET) {
      shading.painted += 1;
      shadePlanet(sprite.image.data, globeTable(size, halo, tilt), map, { kind, light: look.light, turn, exposure: look.exposure, fade: look.fade, fill: look.fill });
      sprite.paint.putImageData(sprite.image, 0, 0);
      sprite.turn = turn;
      sprite.light = [lx, ly, lz];
      sprite.exposure = look.exposure;
      sprite.fade = look.fade;
      sprite.fill = look.fill;
    }
    return sprite.canvas;
  }

  // The bursts alive now: born at random on the face, more often while MOTHER is alarmed, none for
  // someone who asked for stillness. A burst goes off in the rock, not on the glass in front of it:
  // it is kept where it went off on the body (a longitude in the crust's own frame, and a latitude)
  // and rides the turn with the crust, the way the shading reads the crust (`turn` and `tilt`, as in
  // shadeMagma). Kept as a point on the screen instead, it stood still while the body turned some
  // forty degrees under it in a burst's life.
  function magmaBlasts(t, { alarm = 0, reduced = false, turn = 0, tilt = 0 } = {}) {
    const blasts = (nostromo.blasts ??= []);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);
    if (!reduced && Math.random() < (1 / BLAST_EVERY) * (1 + 3 * alarm) / 60) {
      const z = 0.35 + 0.6 * Math.random();
      const angle = Math.random() * Math.PI * 2;
      const ring = Math.sqrt(1 - z * z);
      const x = Math.cos(angle) * ring, y = Math.sin(angle) * ring;
      // From the face in view to the body: the view's tip undone, then the crust's turn added.
      const wy = y * cosTilt + z * sinTilt;
      const wz = z * cosTilt - y * sinTilt;
      blasts.push({ born: t, lon: Math.atan2(x, wz) + turn, lat: Math.asin(Math.max(-1, Math.min(1, wy))) });
    }
    nostromo.blasts = blasts.filter((blast) => t - blast.born < BLAST_LIFE && blast.lon !== undefined);
    return nostromo.blasts.map((blast) => {
      // And back: where that point of the body faces now.
      const lon = blast.lon - turn;
      const cl = Math.cos(blast.lat);
      const bx = cl * Math.sin(lon), wy = Math.sin(blast.lat), wz = cl * Math.cos(lon);
      return { x: bx, y: wy * cosTilt - wz * sinTilt, z: wy * sinTilt + wz * cosTilt, age: (t - blast.born) / BLAST_LIFE };
    });
  }

  // The body's face, painted into a buffer of its own and laid on the disc. Null where there is no
  // pixel buffer, or until the map is whole: the star is drawn the older way until then.
  function magmaFace(radius, pixels, t, { turn, beat, alarm, reduced, tilt = 0 }) {
    if (typeof ImageData !== 'function') return null;
    const map = magmaMap(12);
    if (!map) return null;
    const size = Math.max(32, Math.min(MAGMA_SIZE, 2 * Math.round(radius * pixels)));
    if (!magmaSprite || magmaSprite.size !== size) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const paint = canvas.getContext('2d');
      if (!paint?.createImageData) return null;
      magmaSprite = { canvas, paint, image: paint.createImageData(size, size), size };
    }
    // Painted every other frame: rock this slow, and bursts this short, read the same at half the
    // rate, and the frames between are free for the planets.
    magmaSprite.frame = (magmaSprite.frame ?? 0) + 1;
    if (magmaSprite.painted && magmaSprite.frame % 2) return magmaSprite.canvas;
    magmaSprite.painted = true;
    const flowTime = reduced ? 0 : t;
    shadeMagma(magmaSprite.image.data, sphereTable(size), map, {
      turn,
      flow: turn * 0.82 + flowTime * 0.018,
      beat,
      blasts: magmaBlasts(t, { alarm, reduced, turn, tilt }),
      tilt,
    });
    magmaSprite.paint.putImageData(magmaSprite.image, 0, 0);
    return magmaSprite.canvas;
  }

  function stepNostromo(dt, t) {
    // What is being forgotten holds still while it goes.
    const nodes = nostromo.nodes.filter((node) => node.scale > 0.01 && !node.forgetting);
    const byId = new Map(nodes.map((node) => [node.memory.id, node]));
    for (const node of nodes) {
      if (node.wx === undefined) { node.wx = node.x; node.wy = node.y; node.wz = 0; }
    }
    // A far universe in the Macroverso is `frozen`: its bodies already settled, it only lives —
    // it turns, beats and sends its pulses — without paying for the forces every frame.
    if (nostromo.frozen) {
      for (const node of nodes) { node.spin = (node.spin ?? node.seed) + dt * 0.012 * (1 + (node.seed % 1)); node.axisAge = (node.axisAge ?? 0) + dt / 60; }
    } else {
      for (const node of nodes) {
        let fx = 0;
        let fy = 0;
        let fz = 0;
        const dist = Math.hypot(node.wx, node.wy, node.wz) || 1;
        // A soft shell around the core, in the shape of a brain: too close is pushed out, too far
        // pulled in. The outline gives the reach at this bearing seen from the side; the width
        // gives it toward the temples. `shell` is 1 exactly on the surface.
        const target = NOSTROMO_ORBIT * brainRadius(Math.atan2(node.wy, node.wx)) * shellDepth(node);
        const shell = Math.hypot(Math.hypot(node.wx, node.wy) / target, node.wz / (BRAIN_WIDTH * target)) || 1;
        const pull = (1 / shell - 1) * dist * 0.004;
        fx += (node.wx / dist) * pull;
        fy += (node.wy / dist) * pull;
        fz += (node.wz / dist) * pull;
        if (dist < CORE_R * 1.7) { const push = (CORE_R * 1.7 - dist) * 0.02; fx += (node.wx / dist) * push; fy += (node.wy / dist) * push; fz += (node.wz / dist) * push; }
        // The fissure: out of the midline, back toward the hemisphere it already leans into.
        const gap = FISSURE * NOSTROMO_ORBIT;
        if (Math.abs(node.wz) < gap) fz += Math.sign(node.wz || (frac(node.seed * 0.618) < 0.5 ? -1 : 1)) * (gap - Math.abs(node.wz)) * 0.02;
        const own = node.r3 ?? node.r;
        // Every pair, every frame: the far ones are turned away on the squared distance, before any
        // square root is taken, and the rest without Math.hypot, which costs several times as much.
        for (const other of nodes) {
          if (other === node) continue;
          const ox = node.wx - other.wx;
          const oy = node.wy - other.wy;
          const oz = node.wz - other.wz;
          const reach = (own + (other.r3 ?? other.r) + 46) * 2.2;
          const square = ox * ox + oy * oy + oz * oz;
          if (square >= reach * reach) continue;
          const d = Math.sqrt(square) || 1;
          const push = ((reach - d) / reach) * 0.9;
          fx += (ox / d) * push; fy += (oy / d) * push; fz += (oz / d) * push;
        }
        if (!nostromo.reduced) {
          fx += Math.sin(node.seed + t * 0.38) * 0.02;
          fy += Math.cos(node.seed * 1.3 + t * 0.32) * 0.02;
          fz += Math.sin(node.seed * 0.7 + t * 0.29) * 0.02;
        }
        node.fx = fx;
        node.fy = fy;
        node.fz = fz;
      }
      for (const link of nostromo.links) {
        const a = byId.get(link.a);
        const b = byId.get(link.b);
        if (!a || !b) continue;
        const dx = b.wx - a.wx;
        const dy = b.wy - a.wy;
        const dz = b.wz - a.wz;
        const d = Math.hypot(dx, dy, dz) || 1;
        const rest = (a.r3 ?? a.r) + (b.r3 ?? b.r) + 96;
        const k = (d - rest) * 0.0035 * link.weight;
        a.fx += (dx / d) * k; a.fy += (dy / d) * k; a.fz += (dz / d) * k;
        b.fx -= (dx / d) * k; b.fy -= (dy / d) * k; b.fz -= (dz / d) * k;
      }
      for (const node of nodes) {
        node.wvx = ((node.wvx ?? 0) + node.fx * dt) * 0.86;
        node.wvy = ((node.wvy ?? 0) + node.fy * dt) * 0.86;
        node.wvz = ((node.wvz ?? 0) + node.fz * dt) * 0.86;
        node.wx += node.wvx * dt;
        node.wy += node.wvy * dt;
        node.wz += node.wvz * dt;
        node.spin = (node.spin ?? node.seed) + dt * 0.012 * (1 + (node.seed % 1));
        // The planet's own turn runs on seconds (dt counts frames of 1/60 s).
        node.axisAge = (node.axisAge ?? 0) + dt / 60;
      }
    }
    // A forgotten memory goes on the clock, not by a fixed step a frame, so the implosion takes
    // the same time on any screen; the dust drifts and goes out on the same clock.
    for (const node of nostromo.nodes) if (node.forgetting) node.scale = implosionScale((t - node.forgetting.at) / IMPLOSION);
    nostromo.nodes = nostromo.nodes.filter((node) => !(node.forgetting && t - node.forgetting.at >= IMPLOSION));
    if (nostromo.dust?.length) {
      for (const mote of nostromo.dust) {
        if (t < mote.born || nostromo.reduced) continue;
        mote.x += mote.vx * dt * 0.35;
        mote.y += mote.vy * dt * 0.35;
        mote.vx *= 0.995; mote.vy *= 0.995;
      }
      nostromo.dust = nostromo.dust.filter((mote) => t - mote.born < mote.life);
    }
    if (nostromo.fading?.length) nostromo.fading = nostromo.fading.filter((wire) => t - wire.born < 1.3);
    // The core turns on its own axis, slowly, the way a body does.
    // About one turn in twenty seconds: slow enough to be a body, fast enough to be seen turning.
    nostromo.spin = (nostromo.spin ?? 0) + dt * 0.0052 * (nostromo.cage ? 2.2 : 1);
    // A new beat sends a wave out from the core.
    const { phase } = heartbeat(t);
    if (phase < nostromo.lastPhase && !nostromo.reduced) nostromo.rings.push({ born: t });
    nostromo.lastPhase = phase;
    nostromo.rings = nostromo.rings.filter((ring) => t - ring.born < 2.4);
    pulseNostromo(dt, t, nodes, byId);
  }

  function pulseNostromo(dt, t, nodes, byId) {
    const pulses = nostromo.pulses ?? (nostromo.pulses = []);
    for (const node of nodes) {
      node.lit = Math.max(0, (node.lit ?? 0) - dt * 0.05);
      // Charge is the slow one: a memory being fed from the core and from its neighbours at once
      // builds it up, and one nobody feeds cools off over a minute or so.
      node.charge = Math.max(0, (node.charge ?? 0) - dt * 0.0035);
    }
    nostromo.coreLit = Math.max(0, (nostromo.coreLit ?? 0) - dt * 0.05);
    if (!nostromo.reduced && pulses.length < PULSE_CAP) {
      for (const node of nodes) {
        // An active memory is spoken to often; a forgotten one, rarely.
        if (Math.random() < node.activity * 0.013 * dt) {
          const outward = Math.random() > 0.22;   // most travel out; some answer back
          pulses.push({ from: outward ? null : node, to: outward ? node : null, node, born: t, life: Math.max(0.5, (Math.hypot(node.x, node.y) || 1) / PULSE_SPEED), kind: 'core' });
        }
      }
      for (const link of nostromo.links) {
        const a = byId.get(link.a);
        const b = byId.get(link.b);
        if (!a || !b) continue;
        const together = Math.min(a.activity, b.activity) * link.weight;
        if (Math.random() < together * 0.009 * dt) {
          const forward = Math.random() > 0.5;
          pulses.push({ from: forward ? a : b, to: forward ? b : a, link, born: t, life: Math.max(0.45, (Math.hypot(b.x - a.x, b.y - a.y) || 1) / PULSE_SPEED), kind: 'link' });
        }
      }
    }
    for (const pulse of pulses) {
      if (t - pulse.born < pulse.life) continue;
      // It arrived: whatever it reached lights up for a moment.
      if (pulse.kind === 'link') {
        pulse.to.lit = Math.min(1.4, (pulse.to.lit ?? 0) + 0.7);
        pulse.to.charge = Math.min(1, (pulse.to.charge ?? 0) + 0.09);
      } else if (pulse.to) {
        pulse.to.lit = Math.min(1.4, (pulse.to.lit ?? 0) + 0.9);
        pulse.to.charge = Math.min(1, (pulse.to.charge ?? 0) + 0.13);
      }
      else nostromo.coreLit = Math.min(1.4, (nostromo.coreLit ?? 0) + 0.5);
    }
    nostromo.pulses = pulses.filter((pulse) => t - pulse.born < pulse.life);
  }

  // The camera follows the whole system until the human takes over.
  function fitNostromo() {
    const cam = nostromo.cam;
    if (!cam) return;
    // A held dwarf is where the camera goes, whoever last moved it.
    const witness = nostromo.witness?.forgetting && nostromo.nodes.includes(nostromo.witness) ? nostromo.witness : null;
    const held = (nostromo.selected && nostromo.nodes.includes(nostromo.selected) ? nostromo.selected : null) ?? witness;
    if (held) {
      // Centred in the part of the map the card leaves free, not under the card. How much the
      // card covers is the room's to say; the engine only asks.
      const covered = nostromo.covered?.() ?? 0;
      const aimX = held.x + covered / 2 / cam.scale;
      cam.x += (aimX - cam.x) * 0.08;
      cam.y += (held.y - cam.y) * 0.08;
    }
    if (cam.manual) return;
    const { w, h } = nostromo.size;
    let minX = -CORE_R * 2.4, maxX = CORE_R * 2.4, minY = -CORE_R * 2.4, maxY = CORE_R * 2.4;
    // Across, the frame holds the body at every turn it can take, so turning it never makes the
    // camera breathe in and out; up and down it follows what is on screen.
    const near = VIEW_DISTANCE / (VIEW_DISTANCE - NOSTROMO_ORBIT * BRAIN_WIDTH);
    for (const node of nostromo.nodes) {
      const reach = Math.hypot(node.wx ?? node.x, node.wz ?? 0) * near + node.r * 3;
      minX = Math.min(minX, -reach); maxX = Math.max(maxX, reach);
      minY = Math.min(minY, node.y - node.r * 3); maxY = Math.max(maxY, node.y + node.r * 3);
    }
    // A narrow margin: the constellation is the content of this window, so it takes most of it.
    const pad = 36;
    const scale = Math.min(1.4, Math.max(0.3, Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2 - 24) / (maxY - minY || 1))));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2 - 20 / scale;
    if (!held) { cam.x += (cx - cam.x) * 0.05; cam.y += (cy - cam.y) * 0.05; }
    cam.scale += (scale - cam.scale) * 0.05;
  }
  function toScreen(x, y) { const { w, h } = nostromo.size; const cam = nostromo.cam; return { x: w / 2 + (x - cam.x) * cam.scale, y: h / 2 + (y - cam.y) * cam.scale }; }
  function toWorld(sx, sy) { const { w, h } = nostromo.size; const cam = nostromo.cam; return { x: cam.x + (sx - w / 2) / cam.scale, y: cam.y + (sy - h / 2) / cam.scale }; }

  // The weather of the archive. `grown` is 0 for a room that has distilled nothing and 1 for one
  // worth training on; everything here reads from it and nothing here is ever loud.
  function drawNebula(ctx, t, w, h, cam) {
    const grown = Math.min(1, Math.max(0, nostromo.maturity ?? 0));
    if (nostromo.reduced && !nostromo.nebulaSeen) nostromo.nebulaSeen = true;
    const time = nostromo.reduced ? 0 : t;
    const across = Math.hypot(w, h);
    // Young clouds are scattered wide and thin; a grown room draws them in and fills them out.
    const spread = across * (0.62 - 0.18 * grown);
    const depth = 0.06;   // how much of the camera it follows: far away things barely move
    const cx = w / 2 - cam.x * depth;
    const cy = h / 2 - cam.y * depth;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NEBULA_CLOUDS.length; i += 1) {
      const cloud = NEBULA_CLOUDS[i];
      // As it matures the clouds settle toward one band instead of scattering round the sky.
      const angle = cloud.at + time * cloud.drift * (1.6 - grown);
      const lean = 0.42 * grown;
      const out = spread * cloud.out;
      const x = cx + Math.cos(angle) * out;
      const y = cy + Math.sin(angle) * out * (1 - lean * 0.55);
      const size = across * cloud.size * (0.34 + 0.2 * grown);
      // Breathing, quick and shallow while it storms, slow and deep once it settles.
      const breath = 0.86 + 0.14 * Math.sin(time * (0.5 - 0.34 * grown) + i * 1.7);
      const alpha = NEBULA_CAP * (0.42 + 0.58 * grown) * breath;
      const cloudy = ctx.createRadialGradient(x, y, 0, x, y, size);
      cloudy.addColorStop(0, `rgba(${cloud.hue}, ${alpha})`);
      cloudy.addColorStop(0.42, `rgba(${cloud.hue}, ${alpha * 0.38})`);
      cloudy.addColorStop(1, `rgba(${cloud.hue}, 0)`);
      ctx.fillStyle = cloudy;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }

    // The storm. Often and sharp while the room is young, rare and slow once it is grown: what
    // changes is not how bright a strike is but how often the sky is torn.
    if (!nostromo.reduced) {
      nostromo.bolts = (nostromo.bolts ?? []).filter((bolt) => t - bolt.born < bolt.life);
      const every = 0.9 + 7.5 * grown;   // seconds between strikes, on average
      if (nostromo.bolts.length < 2 && Math.random() < 1 / (every * 60)) {
        // Inside a cloud, and inside the frame. Strikes used to be thrown onto a circle the size
        // of the diagonal, so a third of them happened where nobody could see them and the rest
        // fell through empty sky. Lightning belongs in the weather it comes from.
        const cloud = NEBULA_CLOUDS[Math.floor(Math.random() * NEBULA_CLOUDS.length)];
        const angle = cloud.at + time * cloud.drift * (1.6 - grown);
        const out = spread * cloud.out;
        const lean = 0.42 * grown;
        nostromo.bolts.push({
          born: t, life: 0.5 + Math.random() * 0.45,
          x: Math.min(w * 0.94, Math.max(w * 0.06, cx + Math.cos(angle) * out + (Math.random() - 0.5) * across * 0.16)),
          y: Math.min(h * 0.94, Math.max(h * 0.06, cy + Math.sin(angle) * out * (1 - lean * 0.55) + (Math.random() - 0.5) * across * 0.1)),
          angle: Math.random() * Math.PI * 2,
          reach: across * (0.1 + Math.random() * 0.14),
          seed: Math.random() * 100,
        });
        // The lit cloud always contains the thread inside it: a bolt poking out of its own glow
        // would read as a scratch on the canvas rather than as weather.
        const bolt = nostromo.bolts.at(-1);
        bolt.glow = bolt.reach * (1.7 + Math.random() * 0.8);
      }
      for (const bolt of nostromo.bolts) {
        const age = (t - bolt.born) / bolt.life;
        // It arrives at once and fades: a flash that eased in would read as a lamp, not lightning.
        const flash = Math.max(0, 1 - age) ** 2 * NEBULA_CAP * 2.4;
        // A storm far enough away is seen as the cloud lighting up, not as the bolt. This is what
        // makes it read at all without ever being bright: the sheet carries it, the thread only
        // gives it a shape.
        const sheet = ctx.createRadialGradient(bolt.x, bolt.y, 0, bolt.x, bolt.y, bolt.glow);
        sheet.addColorStop(0, `rgba(132, 152, 245, ${flash * 0.5})`);
        sheet.addColorStop(0.45, `rgba(104, 124, 224, ${flash * 0.16})`);
        sheet.addColorStop(1, 'rgba(90, 110, 210, 0)');
        ctx.fillStyle = sheet;
        ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.glow, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(150, 168, 255, ${flash})`;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        for (let branch = 0; branch < 2; branch += 1) {
          ctx.beginPath();
          ctx.moveTo(bolt.x, bolt.y);
          let px = bolt.x;
          let py = bolt.y;
          let heading = bolt.angle + (branch ? 0.7 : 0);
          for (let step = 1; step <= 5; step += 1) {
            heading += Math.sin(bolt.seed + step * 2.3 + branch) * 0.6;
            px += Math.cos(heading) * (bolt.reach / 5);
            py += Math.sin(heading) * (bolt.reach / 5);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function drawNostromo(t) {
    // The neural drawing of the same scene, when it is asked for (setNeural).
    if (nostromo.neural) { drawNeural(t); return; }
    const ctx = nostromo.canvas.getContext('2d');
    const { w, h, dpr } = nostromo.size;
    const cam = nostromo.cam;
    const { beat } = heartbeat(t);
    const alarm = nostromo.alarm ? Math.max(0, 1 - (t - nostromo.alarm) / 3.6) : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // The nebula, before anything else and behind everything: it is the ground the room stands on.
    // A bare scene — a body painted into a sprite, or composed live over the Macroverso's own
    // space — gets no sky, no stars and no vignette: those belong to whoever holds it.
    if (!nostromo.bare) drawNebula(ctx, t, w, h, cam);

    // Stars, with a little parallax against the camera.
    if (!nostromo.bare) {
      ctx.fillStyle = 'rgba(255, 244, 240, .35)';
      for (let i = 0; i < 120; i += 1) {
        const sx = ((i * 97.3 - cam.x * 0.08) % w + w) % w;
        const sy = ((i * 53.7 + 31 - cam.y * 0.08) % h + h) % h;
        ctx.globalAlpha = 0.12 + 0.22 * Math.abs(Math.sin(t * 0.6 + i));
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);
    // Seen from far (the Macroverso, or a room's map zoomed out), a body is a few pixels: the core
    // reads a little larger so the universe is read by its sun, every glow is softer so a crowd of
    // stars does not run together into a white blot, and a memory never shrinks below a point the
    // eye can still hold. Close up, all of it is as it always was.
    const nearness = Math.min(1, Math.max(0, (cam.scale - 0.1) / 0.3));   // 0 far · 1 near
    // In the Macroverso (a bare scene) a universe seen from far is one small thing among others:
    // its glow, its pulses and its heartbeat's rings dim and shrink with the distance, so the near
    // ones lead and the far ones do not blaze. A room's own NOSTROMO is not bare, and keeps them.
    const farLight = nostromo.bare ? 0.4 + 0.6 * nearness : 1;
    const farSize = nostromo.bare ? 0.45 + 0.55 * nearness : 1;
    const glowAt = (0.5 + 0.5 * nearness) * farLight;
    const R = CORE_R * (1 + 0.07 * beat + 0.12 * alarm) * (1 + 0.22 * (1 - nearness));

    // Plasma between linked memories: they share a theme, so a filament runs between them. Drawn
    // as a wide breath of colour and a thin bright thread: the same glow as a blur, far cheaper.
    const byId = new Map(nostromo.nodes.map((node) => [node.memory.id, node]));
    // An open card is a question about one memory: its own wires answer a little louder, and the
    // one under the cursor in the list answers louder still. Nothing else is dimmed for it.
    const focus = nostromo.selected?.memory.id ?? null;
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b) continue;
      const gain = nostromo.focusLink === link ? 2.4 : focus !== null && (link.a === focus || link.b === focus) ? 1.6 : 1;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(t * 1.3 + a.seed + b.seed) * Math.min(40, d * 0.15);
      link.cx = (a.x + b.x) / 2 - (dy / d) * bow;
      link.cy = (a.y + b.y) / 2 + (dx / d) * bow;
      // Between two memories the wire takes the colour of whichever is nearer, so it leaves one
      // star as that star and arrives as the other, trading hands where they meet.
      const charged = Math.max(a.charge ?? 0, b.charge ?? 0);
      const downhill = (a.charge ?? 0) >= (b.charge ?? 0);
      const near = downhill ? a : b;
      const far = downhill ? b : a;
      // Current runs the way charge does: out of the fuller one and into the emptier.
      const spark = ((t * (0.13 + 0.2 * charged) + a.seed * 0.29 + b.seed * 0.17) % 1 + 1) % 1;
      ctx.strokeStyle = currentAlong(ctx, near.x, near.y, far.x, far.y,
        hexAlpha(near.color, Math.min(0.95, 0.6 * link.weight * gain)),
        { mid: hexAlpha(hexMix(near.color, far.color, 0.5), Math.min(0.8, 0.3 * link.weight * gain)), end: hexAlpha(far.color, Math.min(0.95, 0.6 * link.weight * gain)) },
        spark, 0.18 + 0.7 * charged);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx, link.cy, b.x, b.y);
      ctx.globalAlpha = Math.min(0.7, 0.3 * gain) * glowAt; ctx.lineWidth = (3.4 + 1.6 * charged) * (gain > 1 ? 1.25 : 1) / cam.scale; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = (0.7 + 0.4 * charged + 0.35 * Math.abs(Math.sin(t * 4 + a.seed))) * (gain > 1 ? 1.5 : 1) / cam.scale; ctx.stroke();
    }

    // Plasma from the core to every memory. The filament a memory is spoken to often burns a
    // little brighter than one nobody has needed.
    for (const node of nostromo.nodes) {
      if (node.forgetting) continue;     // its wire is dust now
      const d = Math.hypot(node.x, node.y) || 1;
      const nx = -node.y / d, ny = node.x / d;
      const bow = Math.sin(t * 1.7 + node.seed) * Math.min(60, d * 0.18);
      node.cx = node.x / 2 + nx * bow; node.cy = node.y / 2 + ny * bow;
      node.rimX = (node.x / d) * R * 0.92; node.rimY = (node.y / d) * R * 0.92;
      const life = 0.45 + 0.55 * node.activity;
      const fed = node.charge ?? 0;
      // The wire leaves MOTHER her colour and arrives wearing the star's, changing hands along
      // the way. Current runs down it toward the memory, faster and brighter the better fed it is.
      const head = ((t * (0.16 + 0.22 * fed) + node.seed * 0.37) % 1 + 1) % 1;
      const wire = currentAlong(ctx, node.rimX, node.rimY, node.x, node.y,
        alarm ? 'rgba(255, 230, 220, .95)' : `rgba(226, 40, 22, ${0.62 + 0.3 * life})`,
        { mid: hexAlpha(hexMix('#e22816', node.color, 0.55), (0.3 + 0.3 * life) * (0.6 + 0.5 * fed)), end: hexAlpha(node.color, (0.45 + 0.45 * life) * node.scale) },
        head, 0.25 + 0.75 * fed);
      ctx.strokeStyle = wire;
      ctx.beginPath();
      ctx.moveTo(node.rimX, node.rimY);
      ctx.quadraticCurveTo(node.cx, node.cy, node.x, node.y);
      ctx.globalAlpha = 0.26 * (0.5 + life); ctx.lineWidth = (4 + 2 * fed) / cam.scale; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = (0.8 + 0.5 * life + 0.5 * fed + 0.3 * Math.abs(Math.sin(t * 5 + node.seed * 3)) + 0.5 * beat) / cam.scale; ctx.stroke();
    }

    // The pulses themselves: each one its own errand, none in step with another. Out from the core
    // to the memories it leans on, back again, and between two memories that share a theme.
    for (const pulse of nostromo.pulses ?? []) {
      const u = Math.min(1, (t - pulse.born) / pulse.life);
      let at;
      let color;
      if (pulse.kind === 'link') {
        const { from, to, link } = pulse;
        at = alongCurve(from.x, from.y, link.cx ?? (from.x + to.x) / 2, link.cy ?? (from.y + to.y) / 2, to.x, to.y, u);
        color = to.color;
      } else {
        const node = pulse.node;
        const outward = pulse.to === node;
        const rim = { x: node.rimX ?? 0, y: node.rimY ?? 0 };
        const from = outward ? rim : node;
        const to = outward ? node : rim;
        at = alongCurve(from.x, from.y, node.cx ?? node.x / 2, node.cy ?? node.y / 2, to.x, to.y, u);
        color = outward ? '#ffd0c0' : node.color;
      }
      const size = PULSE_SCALE * (1.9 + 1.3 * Math.sin(u * Math.PI)) * farSize / cam.scale;
      const halo = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, size * 4.5);
      halo.addColorStop(0, hexAlpha(color, 0.85 * farLight));
      halo.addColorStop(1, hexAlpha(color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(at.x, at.y, size * 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 248, 243, .95)';
      ctx.beginPath(); ctx.arc(at.x, at.y, size, 0, Math.PI * 2); ctx.fill();
    }

    // Shockwaves: one ring per beat, expanding and thinning.
    for (const ring of nostromo.rings) {
      const age = t - ring.born;
      if (age < 0) continue;   // a clock driven by hand can step back: a ring not yet born is not drawn
      const radius = R + age * WAVE_SPEED * farSize;
      ctx.strokeStyle = `rgba(255, 60, 40, ${Math.max(0, 0.32 - age * 0.14) * farLight})`;
      ctx.lineWidth = Math.max(0.4, 2.4 - age * 1.1) * farSize / cam.scale;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    }

    // One memory, drawn where the projection put it. Called twice over the list: the ones behind
    // MOTHER before her, so she hides them, and the ones in front after her.
    const drawMemory = (node) => {
      // Never smaller than a point and a half on screen, while it is there at all. A planet holds
      // its size: the breathing the stars had is gone with them (2026-11-15).
      const r = node.scale > 0.01 ? Math.max(node.r * node.scale, 1.5 / cam.scale) : 0;
      if (r <= 0) return;
      const arrive = Math.min(1.2, node.lit ?? 0);
      // Two things decide how much of its light a memory shows. Maturity is what the room has made
      // of it over time: how often it has been reached for, how lately, how woven into the rest.
      // Feeding is what it is being given right now, by MOTHER and by its neighbours at once.
      const grown = node.activity ?? 0;
      const fed = Math.min(1, (node.charge ?? 0) + 0.25 * arrive);
      const burn = Math.min(1, 0.4 * grown + 0.75 * fed);

      // The aberration is a black hole (drawBlackHole). Seen from far, the disc, the ring and the
      // field would be smaller than a pixel and only smear into a stain: a small one reads by what
      // it is, a black point with a thin line of its disc across it and the ring of light round it.
      if (node.memory.kind === COLLAPSED) {
        const S = r * 1.15;
        const lit = (0.6 + 0.4 * burn) * glowAt;
        const turn = node.seed + (nostromo.reduced ? 0 : node.spin * 0.12);
        const roll = (frac(node.seed * 0.37) - 0.5) * 0.5;
        const tone = MEMORY_COLORS.aberration;
        if (S * cam.scale < 7) {
          const px = 1 / cam.scale;
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(roll);
          ctx.lineCap = 'round';
          ctx.strokeStyle = hexAlpha(hexMix(tone, '#ffffff', 0.45), 0.55 * lit);
          ctx.lineWidth = px;
          ctx.beginPath(); ctx.ellipse(0, 0, S * 2.2, S * 2.2 * HOLE_TILT, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          ctx.beginPath(); ctx.arc(0, 0, S, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = hexAlpha(hexMix(tone, '#ffffff', 0.7), 0.7 * lit);
          ctx.beginPath(); ctx.arc(0, 0, S + 0.6 * px, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = hexAlpha(hexMix(tone, '#ffffff', 0.45), 0.55 * lit);
          ctx.beginPath(); ctx.ellipse(0, 0, S * 2.2, S * 2.2 * HOLE_TILT, 0, 0, Math.PI); ctx.stroke();
          ctx.restore();
          if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, S * 1.6, t, cam.scale);
          return;
        }
        drawBlackHole(ctx, node.x, node.y, S, { t, turn, roll, lit, px: 1 / cam.scale, still: nostromo.reduced, colour: tone, dust: S * cam.scale < 30 ? 28 : VOID_DUST.length });
        if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, S * 2.8, t, cam.scale);
        return;
      }

      // Where the sun is from here, in view space: the light comes from it. The projection keeps
      // the planet's place on the screen and its depth; undoing the perspective on the first two
      // gives back the direction in the same space the face is painted in.
      const depth = node.depth ?? 0;
      const near = VIEW_DISTANCE / Math.max(200, VIEW_DISTANCE - depth);
      const vx = node.x / near;
      const vy = node.y / near;
      const away = Math.hypot(vx, vy, depth) || 1;
      const light = [-vx / away, -vy / away, -depth / away];
      // A memory out of circulation is a faded planet; one the archive has never once carried shows
      // less of its light; the one being read is lit a little from the front as well, so it never
      // turns to night when it turns to face you with the sun behind it.
      const fade = travels(node.memory) ? 0 : 1;
      const exposure = (1.1 + 0.35 * burn) * (node.cold ? 0.72 : 1);
      const fill = nostromo.lock?.node === node ? Math.min(1, nostromo.lock.fade ?? 0) : 0;
      const planet = PLANETS[planetOf(node.memory.kind)];
      const halo = planet.air ? PLANET_HALO : 1;

      // Drawn pixel by pixel wherever there is a buffer to paint into.
      const sprite = planetSprite(node, node.r * node.scale, cam.scale * dpr, t, { light, exposure, fade, fill });
      if (sprite) ctx.drawImage(sprite, node.x - r * halo, node.y - r * halo, r * halo * 2, r * halo * 2);
      else {
        // The plainer way, until its map is built or where there is no buffer: the planet's colour,
        // brighter toward the sun, and night laid over the far side along the line to it, as deep
        // as the sphere's own light says at each point of that line.
        const base = fade ? hexMix(planet.base, '#5c6068', 0.65) : planet.base;
        const flat = Math.hypot(light[0], light[1]);
        const ux = flat > 0.04 ? light[0] / flat : 1;
        const uy = flat > 0.04 ? light[1] / flat : 0;
        ctx.save();
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.closePath();
        const bright = ctx.createRadialGradient(node.x + ux * r * 0.45 * flat, node.y + uy * r * 0.45 * flat, r * 0.05, node.x, node.y, r * 1.05);
        bright.addColorStop(0, hexMix(base, '#ffffff', 0.12 + 0.1 * burn));
        bright.addColorStop(0.55, base);
        bright.addColorStop(1, hexMix(base, '#000000', 0.35));
        ctx.fillStyle = bright;
        ctx.fill();
        ctx.clip();
        const night = ctx.createLinearGradient(node.x + ux * r, node.y + uy * r, node.x - ux * r, node.y - uy * r);
        for (let step = 0; step <= 8; step += 1) {
          const along = 1 - step / 4;
          const lit = along * flat + Math.sqrt(Math.max(0, 1 - along * along)) * light[2];
          const dark = (1 - smooth(-0.08, 0.3, lit)) * (node.cold ? 0.96 : 0.93);
          night.addColorStop(step / 8, `rgba(0, 0, 0, ${dark.toFixed(3)})`);
        }
        ctx.fillStyle = night;
        ctx.fillRect(node.x - r, node.y - r, r * 2, r * 2);
        ctx.restore();
      }

      // A pulse landing: the planet catches it, a brief light round it in the colour it arrived in.
      if (arrive > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        const air = ctx.createRadialGradient(node.x, node.y, r * 0.99, node.x, node.y, r * 1.38);
        air.addColorStop(0, hexAlpha(hexMix(node.color, '#ffffff', 0.3), 0.32 * arrive * glowAt));
        air.addColorStop(0.3, hexAlpha(node.color, 0.12 * arrive * glowAt));
        air.addColorStop(1, hexAlpha(node.color, 0));
        ctx.fillStyle = air;
        ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.34, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, r * 1.1, t, cam.scale);
    };
    const ordered = [...nostromo.nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    for (const node of ordered) if ((node.depth ?? 0) < 0) drawMemory(node);

    // ---- MOTHER's core. The human's hand turns the star with the body around it: the turn adds to
    // its longitude, in the same order the memories are projected in.
    const yaw = nostromo.yaw ?? 0;
    const spin = nostromo.spin ?? 0;

    // A scene that has a body of its own at the centre (the Macroverso's sun, 2026-11-10: `noCore`)
    // draws only what is round it.
    if (!nostromo.noCore) {
      // ---- The star: the same sun as the Coordinator's in Home (sunOrb, 2026-11-10, asked by the
      // author: «the sun in the projects does not look like the Coordinator's»). It turns with the
      // body round it when the human's hand turns it, and its skin answers when a pulse comes home.
      const side = Math.min(512, Math.max(SUN_SIDE, 2 ** Math.ceil(Math.log2(Math.max(1, R * 2 * cam.scale * dpr)))));
      // Some engines refuse a second canvas: then the star is its light alone, with no face.
      if (coreSun !== false && (!coreSun || coreSun.canvas.width !== side)) { try { coreSun = sunOrb({ side }); } catch { coreSun = false; } }
      const lit = Math.min(1, nostromo.coreLit ?? 0);
      if (coreSun) {
        const hand = spin - yaw;
        if (t - coreSun.paintedAt >= 1 / 30 || coreSun.paintedAt < 0 || coreSun.hand !== hand) {
          coreSun.paint((nostromo.reduced ? 0 : t * 0.035) + hand, 1);
          coreSun.paintedAt = t;
          coreSun.hand = hand;
        }
        drawSun(ctx, 0, 0, R, coreSun, { beat, lit });
      } else {
        const face = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        face.addColorStop(0, 'rgb(255, 240, 206)');
        face.addColorStop(0.7, 'rgb(250, 206, 140)');
        face.addColorStop(1, 'rgb(214, 120, 52)');
        ctx.fillStyle = face;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- Memories: planets, lit by the sun they go round (drawMemory above, PLANETS).
    for (const node of ordered) if ((node.depth ?? 0) >= 0) drawMemory(node);
    // The cold zone, when it is asked for: a thin dusty ring around every memory the archive has
    // had its chances with and never once carried. The mark is added rather than taken from the
    // rest — these are already the dimmest things out here, and dimming everything else to find
    // them would be turning the map off to look at it.
    if (nostromo.coldOnly) {
      ctx.save();
      ctx.setLineDash([3 / cam.scale, 4 / cam.scale]);
      ctx.lineWidth = 1 / cam.scale;
      for (const node of nostromo.nodes) {
        if (!node.cold || node.scale <= 0.01) continue;
        const breath = Math.sin(t * 0.8 + node.seed);
        ctx.strokeStyle = `rgba(150, 176, 198, ${0.36 + 0.14 * breath})`;
        ctx.beginPath(); ctx.arc(node.x, node.y, node.r * node.scale * 2.2 + 4 + breath, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // The veil: everything falls back, and the held dwarf, its own wires and the sight are drawn
    // again above it.
    const lock = nostromo.lock;
    if (lock?.node && lock.fade > 0.01) {
      const held = lock.node;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // In a bare scene (the Macroverso's live universe) the veil darkens only what is drawn here;
      // the space around is the holder's to darken, all of it, so no square of dark shows.
      if (nostromo.bare) ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(2, 1, 4, ${FOCUS_VEIL * lock.fade})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      const id = held.memory.id;
      ctx.lineCap = 'round';
      for (const link of nostromo.links) {
        if (link.a !== id && link.b !== id) continue;
        const a = byId.get(link.a);
        const b = byId.get(link.b);
        if (!a || !b) continue;
        const other = a === held ? b : a;
        const line = ctx.createLinearGradient(held.x, held.y, other.x, other.y);
        line.addColorStop(0, hexAlpha(held.color, 0.85 * lock.fade));
        line.addColorStop(1, hexAlpha(other.color, 0.55 * lock.fade));
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.2 / cam.scale;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx ?? (a.x + b.x) / 2, link.cy ?? (a.y + b.y) / 2, b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = lock.fade;
      drawMemory(held);
      ctx.globalAlpha = 1;
      if (held === nostromo.selected) {
        const reach = held.memory.kind === COLLAPSED ? held.r * held.scale * 1.35 * 2.4 : held.r * held.scale * 1.1;
        drawSight(ctx, held.x, held.y, reach, t, cam.scale, { locked: true, age: t - lock.at, label: nostromo.words?.locked?.(held.memory) ?? '', still: nostromo.reduced });
      }
    }

    // Forgetting, above everything else: the implosions, and the dust their links became.
    for (const node of nostromo.nodes) if (node.forgetting) drawImplosion(ctx, node, t, cam.scale, nostromo.reduced);
    if (nostromo.dust?.length || nostromo.fading?.length) drawDust(ctx, t, cam.scale);

    // CODE000: the safety box. Bars fall from above and lock around the core.
    drawCage(ctx, t);
    ctx.restore();

    // Vignette that tightens on the beat; red wash while MOTHER is angry.
    if (!nostromo.bare) {
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.35 - 0.03 * beat), w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, `rgba(${alarm ? 60 : 0}, 0, 0, ${0.55 + 0.1 * beat})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      if (alarm) { ctx.fillStyle = `rgba(255, 30, 20, ${0.08 * alarm * (0.6 + 0.4 * Math.sin(t * 18))})`; ctx.fillRect(0, 0, w, h); }
    }

    // The hovered memory, named on screen; not while another one is held, which is the one being read.
    drawHoverLabel(ctx, w);
    fadeOver(ctx, t);
  }

  // ---- NEURAL MODE: the same scene, drawn as neurons (see NEURAL_AXON above). -----------------
  // Changing the drawing: what was on the canvas is kept a moment and fades over the new one, and
  // coming on, the light runs out from the core and reaches every neuron in turn.
  function setNeural(on, t) {
    const want = Boolean(on);
    if (Boolean(nostromo.neural) === want) return;
    const canvas = nostromo.canvas;
    let held = null;
    if (canvas?.width && canvas.height && typeof document !== 'undefined') {
      held = document.createElement('canvas');
      held.width = canvas.width;
      held.height = canvas.height;
      held.getContext('2d').drawImage(canvas, 0, 0);
    }
    nostromo.neural = want;
    nostromo.neuralSince = want && !nostromo.reduced ? t : null;
    nostromo.fadeFrom = held && !nostromo.reduced ? { canvas: held, at: t } : null;
  }
  function fadeOver(ctx, t) {
    const from = nostromo.fadeFrom;
    if (!from) return;
    const k = (t - from.at) / NEURAL_CROSSFADE;
    if (k >= 1 || k < 0) { nostromo.fadeFrom = null; return; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1 - k * (2 - k);
    ctx.drawImage(from.canvas, 0, 0);
    ctx.restore();
  }
  // A memory's colour in this drawing: the photographs' palette, one hue per kind.
  const neuralTone = (node) => NEURAL_COLORS[node.memory?.kind] ?? node.color;
  function drawNeural(t) {
    const ctx = nostromo.canvas.getContext('2d');
    const { w, h, dpr } = nostromo.size;
    const cam = nostromo.cam;
    const { beat } = heartbeat(t);
    const alarm = nostromo.alarm ? Math.max(0, 1 - (t - nostromo.alarm) / 3.6) : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!nostromo.bare) {
      neuralGround(ctx, w, h, beat);
      // Depth: cells far behind the scene, out of focus, drifting slowly the other way.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i += 1) {
        const hue = i % 3 === 0 ? NEURAL_COLORS.decision : NEURAL_COLORS.fact;
        const bx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const by = ((Math.sin(i * 78.233) * 12345.6789) % 1 + 1) % 1;
        const drift = nostromo.reduced ? 0 : Math.sin(t * 0.05 + i) * 12;
        const size = 22 + (i % 5) * 14;
        ctx.globalAlpha = 0.035 + (i % 4) * 0.012;
        ctx.drawImage(neuronGlow(hue), bx * w + drift - (cam.x ?? 0) * 0.02 - size, by * h - drift * 0.6 - (cam.y ?? 0) * 0.02 - size, size * 2, size * 2);
      }
      // What floats between the cells, as in the photographs (2026-10-28): small warm motes and a few
      // cold ones, drifting slowly and breathing in and out of the light.
      for (let i = 0; i < 42; i += 1) {
        const mx = ((Math.sin(i * 91.7) * 23456.789) % 1 + 1) % 1;
        const my = ((Math.sin(i * 47.3) * 34567.891) % 1 + 1) % 1;
        const float = nostromo.reduced ? 0 : t * (4 + (i % 7));
        const px0 = ((mx * w + float * (i % 2 ? 1 : -0.6) - (cam.x ?? 0) * 0.05) % w + w) % w;
        const py0 = ((my * h - float * 0.5 - (cam.y ?? 0) * 0.05) % h + h) % h;
        const breath = nostromo.reduced ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * 0.4 + i * 1.3));
        const size = 1.5 + (i % 4);
        ctx.globalAlpha = (i % 3 ? 0.32 : 0.22) * breath;
        ctx.drawImage(neuronGlow(i % 5 === 0 ? NEURAL_COLORS.fact : NEURON_SPARK), px0 - size, py0 - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);
    const px = 1 / cam.scale;
    const nearness = Math.min(1, Math.max(0, (cam.scale - 0.1) / 0.3));
    const farLight = nostromo.bare ? 0.45 + 0.55 * nearness : 1;
    const farSize = nostromo.bare ? 0.5 + 0.5 * nearness : 1;
    const R = CORE_R * (1 + 0.05 * beat + 0.1 * alarm);
    const nodes = nostromo.nodes;
    const byId = new Map(nodes.map((node) => [node.memory.id, node]));
    // Coming on: a front of light leaves the core and every neuron appears as it is reached,
    // brightest at the moment it is crossed.
    const since = nostromo.neuralSince;
    const ignite = since === null || since === undefined ? 1 : Math.min(1, Math.max(0, (t - since) / NEURAL_IGNITION));
    let span = 1;
    if (ignite < 1) for (const node of nodes) span = Math.max(span, Math.hypot(node.x, node.y));
    const front = ignite < 1 ? (ignite * (2 - ignite)) * (span + 160) : Infinity;
    const shown = (node) => (front === Infinity ? 1 : Math.min(1, Math.max(0, (front - Math.hypot(node.x, node.y)) / 90)));
    const crossed = (node) => (front === Infinity ? 0 : Math.max(0, 1 - Math.abs(front - Math.hypot(node.x, node.y)) / 110));
    const lightOf = (node) => Math.min(1.6, (node.lit ?? 0) + 0.5 * (node.charge ?? 0) + 1.3 * crossed(node));
    // Where the wires run: the full drawing's own curves, bent less, so the pulses still ride them.
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(t * 0.7 + a.seed + b.seed) * Math.min(22, d * 0.07);
      link.cx = (a.x + b.x) / 2 - (dy / d) * bow;
      link.cy = (a.y + b.y) / 2 + (dx / d) * bow;
    }
    for (const node of nodes) {
      const d = Math.hypot(node.x, node.y) || 1;
      const bow = Math.sin(t * 0.9 + node.seed) * Math.min(26, d * 0.08);
      node.cx = node.x / 2 + (-node.y / d) * bow; node.cy = node.y / 2 + (node.x / d) * bow;
      node.rimX = (node.x / d) * R * 0.92; node.rimY = (node.y / d) * R * 0.92;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // The axons from the core, then the synapses between memories: each set in one stroke.
    const reveal = front === Infinity ? 1 : ignite;
    // Tracts, not lines (2026-10-27): each axon and each synapse a few strands that part and meet.
    ctx.strokeStyle = `rgba(${NEURAL_AXON}, ${0.16 * farLight * reveal})`;
    ctx.lineWidth = 0.7 * px;
    ctx.beginPath();
    for (const node of nodes) if (!node.forgetting && shown(node) > 0) fibreBundle(ctx, node.rimX, node.rimY, node.cx, node.cy, node.x, node.y, { strands: 3, spread: 4 * px * farSize, seed: node.seed });
    ctx.stroke();
    // Between two memories, tissue in the colours of both (2026-10-27): one viscous tube that leaves
    // each cell full and thins between them, and two fine fibres peeling off it. Nearer is thicker.
    ctx.globalCompositeOperation = 'source-over';
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b || shown(a) <= 0 || shown(b) <= 0) continue;
      const colour = hexMix(neuralTone(a), neuralTone(b), 0.5);
      const persp = ((a.r3 ? a.r / a.r3 : 1) + (b.r3 ? b.r / b.r3 : 1)) / 2;
      const depthLight = 0.55 + 0.45 * Math.min(1, Math.max(0, (((a.depth ?? 0) + (b.depth ?? 0)) / 2 + 700) / 1400));
      gooTube(ctx, a.x, a.y, link.cx, link.cy, b.x, b.y, { w: 2.6 * persp * farSize, mid: 0.3, colour, alpha: 0.75 * farLight * reveal * depthLight, seed: a.seed + b.seed, min: 0.5 * px });
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexAlpha(colour, 0.16 * farLight * reveal * depthLight);
      ctx.lineWidth = 0.5 * px;
      ctx.beginPath();
      fibreBundle(ctx, a.x, a.y, link.cx, link.cy, b.x, b.y, { strands: 2, spread: 9 * px * farSize, seed: a.seed + b.seed });
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'lighter';
    // A synapse whose neurons are lit answers in their colours.
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b) continue;
      const glow = Math.max(lightOf(a), lightOf(b)) * Math.min(shown(a), shown(b));
      if (glow < 0.12) continue;
      ctx.strokeStyle = hexAlpha(hexMix(neuralTone(a), neuralTone(b), 0.5), Math.min(0.4, 0.2 * glow) * farLight);
      ctx.lineWidth = (0.7 + 0.4 * Math.min(1, glow)) * px;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx, link.cy, b.x, b.y); ctx.stroke();
    }
    // The pulses: a head of light and the stretch of path it has just lit, fading behind it.
    for (const pulse of nostromo.pulses ?? []) {
      const u = Math.min(1, (t - pulse.born) / pulse.life);
      let path;
      let color;
      if (pulse.kind === 'link') {
        const { from, to, link } = pulse;
        path = (k) => alongCurve(from.x, from.y, link.cx ?? (from.x + to.x) / 2, link.cy ?? (from.y + to.y) / 2, to.x, to.y, k);
        color = to.color;
      } else {
        const node = pulse.node;
        const outward = pulse.to === node;
        const rim = { x: node.rimX ?? 0, y: node.rimY ?? 0 };
        const from = outward ? rim : node;
        const to = outward ? node : rim;
        path = (k) => alongCurve(from.x, from.y, node.cx ?? node.x / 2, node.cy ?? node.y / 2, to.x, to.y, k);
        color = outward ? '#bfe6ff' : node.color;
      }
      const head = path(u);
      let behind = head;
      for (let step = 1; step <= 6; step += 1) {
        const back = path(Math.max(0, u - step * 0.035));
        ctx.strokeStyle = hexAlpha(color, (0.55 - step * 0.08) * farLight);
        ctx.lineWidth = (1.6 - step * 0.18) * px * farSize;
        ctx.beginPath(); ctx.moveTo(behind.x, behind.y); ctx.lineTo(back.x, back.y); ctx.stroke();
        behind = back;
      }
      const size = (7 + 4 * Math.sin(u * Math.PI)) * px * farSize;
      ctx.globalAlpha = 0.95 * farLight;
      ctx.drawImage(neuronGlow(color), head.x - size, head.y - size, size * 2, size * 2);
      ctx.globalAlpha = 1;
    }
    // The beat leaves the bulb as a cold ring.
    for (const ring of nostromo.rings ?? []) {
      const age = t - ring.born;
      if (age < 0) continue;
      ctx.strokeStyle = `rgba(${NEURAL_AXON}, ${Math.max(0, 0.14 - age * 0.06) * farLight})`;
      ctx.lineWidth = Math.max(0.4, 1.6 - age * 0.7) * px * farSize;
      ctx.beginPath(); ctx.arc(0, 0, R + age * WAVE_SPEED * farSize, 0, Math.PI * 2); ctx.stroke();
    }
    // The front of light while the mode comes on.
    if (front !== Infinity) {
      ctx.strokeStyle = `rgba(200, 236, 255, ${0.5 * (1 - ignite)})`;
      ctx.lineWidth = 1.4 * px;
      ctx.beginPath(); ctx.arc(0, 0, front, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // The neurons, each a cell of its kind (2026-10-27): the more the room leans on one, the more
    // alive it is — larger, its colour full, a breath of light round it; one the room no longer uses
    // goes out, grey and flickering lower the less it was used; a claim found false is a dead cell,
    // only its shape in points. What reaches a neuron now lights it from the heart.
    const drawNeuron = (node) => {
      if (node.forgetting || node.scale <= 0.01) return;
      const seen = shown(node);
      if (seen <= 0) return;
      // Truly in space (2026-10-27): a nearer cell is larger, a further one smaller and dimmer.
      const persp = node.r3 ? node.r / node.r3 : 1;
      const near = 0.55 + 0.45 * Math.min(1, Math.max(0, ((node.depth ?? 0) + 700) / 1400));
      const activity = node.activity ?? 0;
      const shape = Math.floor((node.seed * 1000) % NEURON_SHAPES);
      const fade = seen * near * farLight;
      if (node.memory.kind === COLLAPSED) {
        const side = 5 * persp * farSize * 12 * (0.6 + 0.4 * node.scale);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.8 * fade;
        ctx.drawImage(neuronSprite(neuralTone(node), shape, 'dead'), node.x - side / 2, node.y - side / 2, side, side);
        return;
      }
      const light = lightOf(node);
      const cold = !travels(node.memory);
      const life = cold ? 0.08 + 0.22 * activity : 0.3 + 0.7 * activity;
      const flicker = cold && !nostromo.reduced ? 0.78 + 0.22 * Math.sin(t * 1.3 + node.seed * 7) * Math.sin(t * 0.41 + node.seed) : 1;
      const breath = nostromo.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.4 + node.seed * 3);
      const soma = (4.5 + 3.5 * activity) * persp * farSize * (0.6 + 0.4 * node.scale);
      const side = soma * 12;
      const colour = neuralTone(node);
      ctx.globalCompositeOperation = 'source-over';
      // How alive it is, baked into its colour (NEURON_LIVES), and how much light it has on top.
      const baked = neuronLife(life);
      ctx.globalAlpha = Math.min(1, 0.35 + 0.65 * life) * flicker * fade;
      // Alive and near enough to be seen moving, its dendrites sway (2026-10-28); small, or with motion
      // reduced, it is the still drawing.
      if (!nostromo.reduced && side * cam.scale > 44) drawNeuronRig(ctx, neuronRig(colour, shape, baked), node.x, node.y, side, t, node.seed);
      else ctx.drawImage(neuronSprite(colour, shape, 'alive', baked), node.x - side / 2, node.y - side / 2, side, side);
      ctx.globalCompositeOperation = 'lighter';
      // Its light: a breath round a cell in use, more while something reaches it — kept close to it.
      const glow = Math.max(light, cold ? 0 : 0.12 * life * breath);
      if (glow > 0.05) {
        const size = soma * (1.4 + 1.2 * Math.min(1, light));
        ctx.globalAlpha = Math.min(0.55, 0.45 * glow) * fade;
        ctx.drawImage(neuronGlow(colour), node.x - size, node.y - size, size * 2, size * 2);
      }
    };
    // Far to near: the cells behind the core first, then the core, then the ones before it, so
    // the body hides what is behind it from whichever side it is seen.
    const byDepth = nodes.slice().sort((p, q) => (p.depth ?? 0) - (q.depth ?? 0));
    for (const node of byDepth) if ((node.depth ?? 0) < 0) drawNeuron(node);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // The central bulb.
    drawNeuralBulb(ctx, 0, 0, R, t, { yaw: (nostromo.spin ?? 0) * 0.2 + (nostromo.yaw ?? 0), pitch: nostromo.pitch ?? 0, beat, lit: nostromo.coreLit ?? 0, alarm, px, light: farLight, ignite, still: nostromo.reduced });
    for (const node of byDepth) if ((node.depth ?? 0) >= 0) drawNeuron(node);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const node of nodes) if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, 9 * px, t, cam.scale);
    // A held memory: everything else falls back; it, its synapses and its sight come forward.
    const lock = nostromo.lock;
    if (lock?.node && lock.fade > 0.01) {
      const held = lock.node;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nostromo.bare) ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(1, 3, 9, ${FOCUS_VEIL * lock.fade})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      const id = held.memory.id;
      ctx.globalCompositeOperation = 'lighter';
      for (const link of nostromo.links) {
        if (link.a !== id && link.b !== id) continue;
        const a = byId.get(link.a);
        const b = byId.get(link.b);
        if (!a || !b) continue;
        ctx.strokeStyle = hexAlpha(hexMix(a.color, b.color, 0.5), 0.7 * lock.fade);
        ctx.lineWidth = 1.2 * px;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx ?? (a.x + b.x) / 2, link.cy ?? (a.y + b.y) / 2, b.x, b.y); ctx.stroke();
        const other = a === held ? b : a;
        const size = 9 * px;
        ctx.globalAlpha = 0.8 * lock.fade;
        ctx.drawImage(neuronGlow(other.color), other.x - size, other.y - size, size * 2, size * 2);
        ctx.globalAlpha = 1;
      }
      const size = 16 * px;
      ctx.globalAlpha = lock.fade;
      ctx.drawImage(neuronGlow(held.color), held.x - size, held.y - size, size * 2, size * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (held === nostromo.selected) drawSight(ctx, held.x, held.y, 12 * px, t, cam.scale, { locked: true, age: t - lock.at, label: nostromo.words?.locked?.(held.memory) ?? '', still: nostromo.reduced });
    }
    for (const node of nodes) if (node.forgetting) drawImplosion(ctx, node, t, cam.scale, nostromo.reduced);
    if (nostromo.dust?.length || nostromo.fading?.length) drawDust(ctx, t, cam.scale);
    drawCage(ctx, t);
    ctx.restore();
    // The dark closes round the edges, a little on the beat; red while the core is angry.
    if (!nostromo.bare) {
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.38 - 0.02 * beat), w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, `rgba(${alarm ? 60 : 0}, 0, ${alarm ? 0 : 6}, ${0.6 + 0.08 * beat})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      if (alarm) { ctx.fillStyle = `rgba(255, 30, 20, ${0.08 * alarm * (0.6 + 0.4 * Math.sin(t * 18))})`; ctx.fillRect(0, 0, w, h); }
    }
    drawHoverLabel(ctx, w);
    fadeOver(ctx, t);
  }
  // CODE000: the safety box, in the scene's world. Shared by both drawings.
  function drawCage(ctx, t) {
    if (!nostromo.cage) return;
    const age = t - nostromo.cage.at;
    const p = nostromo.cage.closed ? 1 : Math.min(1, age / 1.1);
    const ease = 1 - Math.pow(1 - p, 3);
    const B = CORE_R * 2.05;
    const drop = (1 - ease) * 900;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * ease})`;
    ctx.fillRect(-B - 8, -B - 8 - drop, B * 2 + 16, B * 2 + 16);
    const steel = ctx.createLinearGradient(-B, 0, B, 0);
    steel.addColorStop(0, '#2a2c30'); steel.addColorStop(0.45, '#9aa0a8'); steel.addColorStop(0.55, '#d8dde3'); steel.addColorStop(1, '#3a3d42');
    ctx.strokeStyle = steel;
    ctx.lineCap = 'butt';
    ctx.shadowColor = 'rgba(0, 0, 0, .9)'; ctx.shadowBlur = 14;
    ctx.lineWidth = 7;
    for (let i = 0; i <= 6; i += 1) {
      const x = -B + (i * 2 * B) / 6;
      ctx.beginPath(); ctx.moveTo(x, -B - drop); ctx.lineTo(x, B - drop); ctx.stroke();
    }
    ctx.lineWidth = 9;
    for (const y of [-B, 0, B]) { ctx.beginPath(); ctx.moveTo(-B - 4, y - drop); ctx.lineTo(B + 4, y - drop); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Rivets at the joints.
    ctx.fillStyle = '#e8ecf0';
    for (let i = 0; i <= 6; i += 1) for (const y of [-B, 0, B]) { ctx.beginPath(); ctx.arc(-B + (i * 2 * B) / 6, y - drop, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // The lock plate.
    if (ease > 0.98) {
      ctx.fillStyle = '#1b1d20'; ctx.fillRect(-B * 0.32, B - 14, B * 0.64, 28);
      ctx.strokeStyle = '#c4c9cf'; ctx.lineWidth = 2; ctx.strokeRect(-B * 0.32, B - 14, B * 0.64, 28);
      ctx.fillStyle = '#ff2a1f'; ctx.font = `700 ${Math.round(B * 0.1)}px ${getComputedStyle(nostromo.canvas).getPropertyValue('--mono') || 'monospace'}`; ctx.textAlign = 'center'; ctx.fillText('CODE000', 0, B + 6); ctx.textAlign = 'start';
    }
    if (!nostromo.cage.closed && p >= 1 && !nostromo.cage.clanged) { nostromo.cage.clanged = true; nostromo.onClang?.(); }
  }
  // The hovered memory, named on screen. Shared by both drawings.
  function drawHoverLabel(ctx, w) {
    if (!nostromo.hover || nostromo.hover.scale <= 0.5 || nostromo.selected) return;
    const cam = nostromo.cam;
    const node = nostromo.hover;
    const p = toScreen(node.x, node.y);
    const label = `${nostromo.words?.kind?.(node.memory.kind) ?? node.memory.kind} · ${node.memory.text.length > 72 ? `${node.memory.text.slice(0, 71)}…` : node.memory.text}`;
    ctx.font = '11px ' + (getComputedStyle(nostromo.canvas).getPropertyValue('--mono') || 'monospace');
    const width = ctx.measureText(label).width + 16;
    const lx = Math.min(w - width - 8, Math.max(8, p.x - width / 2));
    const ly = p.y + node.r * cam.scale + 14;
    ctx.fillStyle = 'rgba(3, 2, 3, .85)';
    ctx.fillRect(lx, ly, width, 22);
    ctx.strokeStyle = hexAlpha(node.color, 0.6);
    ctx.strokeRect(lx + 0.5, ly + 0.5, width - 1, 21);
    ctx.fillStyle = '#eef1ea';
    ctx.fillText(label, lx + 8, ly + 15);
  }

  // Whether there is a camera to answer the pointer with. The canvas takes events from the moment
  // it is on the page, and the camera only exists once the map has started: a pointer that moved
  // over it while the archive was still loading reached for a camera that was not there yet.
  function nostromoLive() { return Boolean(nostromo.cam && nostromo.size); }

  // Pointer: what is under it, in world space; the core counts too.
  function nostromoAt(event) {
    if (!nostromoLive()) return null;
    const rect = nostromo.canvas.getBoundingClientRect();
    const p = toWorld(event.clientX - rect.left, event.clientY - rect.top);
    const slack = 8 / nostromo.cam.scale;
    let best = null;
    const core = Math.hypot(p.x, p.y) <= CORE_R * 1.15;
    for (const node of nostromo.nodes) {
      if (node.forgetting) continue;
      const d = Math.hypot(node.x - p.x, node.y - p.y);
      if (d > node.r * node.scale + slack) continue;
      // What MOTHER hides cannot be clicked through her, and of two that overlap, the nearer wins.
      if (core && (node.depth ?? 0) < 0) continue;
      if (!best || (node.depth ?? 0) > (best.node.depth ?? 0)) best = { node, d };
    }
    if (best) return best.node;
    return Math.hypot(p.x, p.y) <= CORE_R * 1.15 ? 'core' : null;
  }

  // The bodies, from what the archive sent: every memory a node, sized by how much ledger it
  // covers, coloured by its kind and lit only if it still travels; between those that share a
  // theme, the links. Planets start in their kind's sector and drift toward the memories they
  // agree with, so topics gather on their own. What is said about them is the page's to say.
  function buildNodes(data) {
    // How grown the archive is, for the weather behind it to read.
    nostromo.maturity = data.maturity?.score ?? 0;
    nostromo.stage = data.maturity?.stage ?? null;
    const kinds = Object.keys(MEMORY_COLORS);
    const memories = data.memories ?? [];
    nostromo.links = (data.links ?? []).filter((link) => memories.some((m) => m.id === link.a) && memories.some((m) => m.id === link.b));
    const degree = new Map();
    for (const link of nostromo.links) { degree.set(link.a, (degree.get(link.a) ?? 0) + 1); degree.set(link.b, (degree.get(link.b) ?? 0) + 1); }
    nostromo.pulses = [];
    const raw = memories.map((memory) => rawActivity(memory, degree.get(memory.id) ?? 0));
    const top = raw.reduce((best, value) => (value > best ? value : best), 0);
    nostromo.rawTop = top;
    // How much each one knows, read against the richest of this archive (2026-10-28).
    const known = memories.map(knowledgeOf);
    const richest = known.reduce((best, value) => (value > best ? value : best), 0);
    nostromo.nodes = memories.map((memory, index) => {
      const sector = kinds.indexOf(memory.kind) < 0 ? 1 : kinds.indexOf(memory.kind);
      const angle = (sector / kinds.length) * Math.PI * 2 + ((index % 7) / 7 - 0.5) * (Math.PI / 2.4) + Math.random() * 0.2;
      const distance = 0.42 + Math.random() * 0.5;
      return { memory, cold: memory.cold ?? null, angle, distance, activity: activityOf(raw[index], top), lit: 0, charge: 0, x: 0, y: 0, vx: 0, vy: 0, r: MEMORY_SCALE * bodyOf(known[index], richest), scale: 1, seed: Math.random() * Math.PI * 2, rate: 0.5 + Math.random() * 0.9, tilt: PLANET_TILTS[Math.floor(Math.random() * PLANET_TILTS.length)], sense: Math.random() < 0.5 ? -1 : 1, period: 50 + Math.random() * 90, color: travels(memory) ? (MEMORY_COLORS[memory.kind] ?? MEMORY_COLORS.fact) : hexMix(MEMORY_COLORS[memory.kind] ?? MEMORY_COLORS.fact, '#0b0f16', 0.52), placed: false };
    });
    return nostromo.nodes;
  }

  return {
    buildNodes, sizeNostromo, placeNostromo, stepNostromo, focusNostromo, projectNostromo, fitNostromo, drawNostromo, drawNebula, heartbeat, setNeural,
    toScreen, toWorld, nostromoLive, nostromoAt, beginImplosion, drawImplosion, drawDust, drawSight, planetSprite, magmaFace,
  };
}
