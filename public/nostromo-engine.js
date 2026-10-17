// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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

// Memories burn as stars burn, and a star's colour is its class. A decision is a yellow dwarf,
// the steady kind a system is built around. A fact is a white dwarf: cold, dense, settled. A
// preference is a green dwarf, personal and very long lived. A question is a blue dwarf, the
// hottest thing in the sky and the least settled. One palette for the room, the Macroverso and
// the stylesheet (`--mem-*`): a test keeps them the same.
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
export const PITCH_LIMIT = 1.1;       // the head tips forward and back, never over
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

// ---- The skin of a dwarf.
// A star of any class has the same boiling surface; what changes is the colour it boils in. One
// strip is built per class, the first time that class is asked for, and every memory of that
// class wears it. The strip repeats left to right, so a body can turn inside it without a seam.
const dwarfSkins = new Map();
// A dwarf's face is laid on in columns across its width, each as wide as a sphere is at that
// longitude: the sine of evenly spaced longitudes from one limb to the other.
const SKIN_COLUMNS = 8;
const SKIN_EDGES = Array.from({ length: SKIN_COLUMNS + 1 }, (_, k) => Math.sin(-Math.PI / 2 + (k / SKIN_COLUMNS) * Math.PI));
export function dwarfTexture(hex) {
  if (dwarfSkins.has(hex)) return dwarfSkins.get(hex);
  let skin = null;
  try {
    const base = [1, 3, 5].map((at) => Number.parseInt(String(hex).slice(at, at + 2), 16));
    if (base.some((value) => !Number.isFinite(value))) throw new Error('not a colour');
    const shade = (amount, alpha) => `rgba(${base.map((value) => Math.round(Math.min(255, value * amount))).join(', ')}, ${alpha})`;
    const white = (amount, alpha) => `rgba(${base.map((value) => Math.round(value + (255 - value) * amount)).join(', ')}, ${alpha})`;
    const width = 320;
    const height = 160;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height;
    const paint = canvas.getContext('2d');
    if (!paint) throw new Error('no context');
    // The ground of the face, in the star's own colour. A dwarf is bright from edge to edge, so
    // this is the colour at rest rather than a dark floor: the mottling reads against it both
    // ways, darker where the gas is cooler and white where it is alight.
    paint.fillStyle = shade(0.46, 1);
    paint.fillRect(0, 0, width * 2, height);
    const cell = (x, y, size, heat) => {
      for (const at of [x - width, x, x + width]) {
        const glow = paint.createRadialGradient(at, y, 0, at, y, size);
        if (heat > 0.88) {
          // The few points that are truly alight, which is what the eye finds first.
          glow.addColorStop(0, white(0.85, 0.95));
          glow.addColorStop(0.4, white(0.35, 0.5));
        } else if (heat > 0.52) {
          glow.addColorStop(0, white(0.2 + heat * 0.3, 0.45 + heat * 0.35));
          glow.addColorStop(0.5, shade(1.05, 0.24));
        } else {
          glow.addColorStop(0, shade(0.2 + heat * 0.5, 0.5));
          glow.addColorStop(0.5, shade(0.22, 0.24));
        }
        glow.addColorStop(1, shade(0.5, 0));
        paint.fillStyle = glow;
        paint.beginPath(); paint.arc(at, y, size, 0, Math.PI * 2); paint.fill();
      }
    };
    for (let i = 0; i < 420; i += 1) cell(Math.random() * width, Math.random() * height, 7 + Math.random() * 15, Math.random() * 0.82);
    for (let i = 0; i < 1100; i += 1) cell(Math.random() * width, Math.random() * height, 1.8 + Math.random() * 4.5, Math.random());
    skin = canvas;
  } catch {
    skin = null;   // no canvas to build in: the star keeps its gradient and loses its grain
  }
  dwarfSkins.set(hex, skin);
  return skin;
}

// ---- The legend's stars (moved here from app.js on 2026-10-10, so the Project map draws the same
// ones as the Memory map).
// A real dwarf, small enough to sit in a chip: the same ground, the same boiling face and the
// same limb the ones in the constellation wear, so the legend shows the thing and not a swatch.
export function dwarfChip(hex, px) {
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
  paint.save();
  paint.beginPath(); paint.arc(r, r, r, 0, Math.PI * 2); paint.closePath();
  const ground = paint.createRadialGradient(r * 0.72, r * 0.72, r * 0.04, r, r, r * 1.1);
  ground.addColorStop(0, hexMix(hex, '#ffffff', 0.75));
  ground.addColorStop(0.42, hex);
  ground.addColorStop(1, hexMix(hex, '#000000', 0.62));
  paint.fillStyle = ground;
  paint.fill();
  paint.clip();
  const skin = dwarfTexture(hex);
  if (skin) {
    paint.globalAlpha = 0.72;
    paint.drawImage(skin, 0, 0, skin.width * 0.28, skin.height, -r * 0.08, -r * 0.08, px * 1.08, px * 1.08);
    paint.globalAlpha = 1;
  }
  const limb = paint.createRadialGradient(r, r, r * 0.3, r, r, r);
  limb.addColorStop(0, 'rgba(0, 0, 0, 0)');
  limb.addColorStop(0.78, 'rgba(0, 0, 0, .18)');
  limb.addColorStop(1, 'rgba(0, 0, 0, .6)');
  paint.fillStyle = limb;
  paint.fillRect(0, 0, px, px);
  paint.restore();
  return canvas;
}

// The collapsed body, small enough for a chip: a hole with the ring of what fell into it.
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
  // The same thing the constellation draws, small: dust, a round black nothing, a cold rim.
  paint.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i += 1) {
    const speck = VOID_DUST[i * 4];
    const at = r * (0.78 + 0.22 * speck.out);
    const x = r + Math.cos(speck.angle) * at;
    const y = r + Math.sin(speck.angle) * at;
    paint.fillStyle = `rgba(${speck.colour}, ${0.8 - 0.4 * speck.out})`;
    paint.beginPath(); paint.arc(x, y, 0.55, 0, Math.PI * 2); paint.fill();
  }
  paint.globalCompositeOperation = 'source-over';
  paint.fillStyle = '#000000';
  paint.beginPath(); paint.arc(r, r, r * 0.66, 0, Math.PI * 2); paint.fill();
  paint.globalCompositeOperation = 'lighter';
  paint.strokeStyle = 'rgba(168, 204, 255, .75)';
  paint.lineWidth = 0.9;
  paint.beginPath(); paint.arc(r, r, r * 0.69, 0.6, 3.5); paint.stroke();
  paint.strokeStyle = 'rgba(140, 180, 245, .45)';
  paint.beginPath(); paint.arc(r, r, r * 0.74, 3.9, 5.9); paint.stroke();
  paint.globalCompositeOperation = 'source-over';
  return canvas;
}

// ---- A dwarf, drawn the way a star looks.
//
// A dwarf makes its own light, so nothing out here lights it and nothing shades it: there is
// no side turned away. What makes it round is what makes the Sun round in a white-light photo.
//
//   Limb darkening. The disc is brightest in the middle and dims toward the edge, the same all
//   the way round: at the limb the eye sees into higher, cooler gas. It dims more in blue than
//   in red, so the edge is also warmer than the centre.
//   Granulation. The surface is cells: hot plasma rising in bright cores, cooling gas sinking in
//   the dark lanes between them. Seen toward the limb the cells foreshorten and the pattern fades.
//   Spots. A dark umbra inside a paler penumbra, where the field holds the heat down.
//   Faculae. Bright patches around the spots, plain near the limb and nearly lost in the middle.
//
// Each class wears these in its own proportion: a white dwarf is smooth and white-hot, a yellow
// one is a sun with granules and spots. The surface is a map of the whole body in latitude and
// longitude, built once per class from noise sampled on the sphere itself, so it has no seam and
// nothing stretches at the poles; turning the body is sliding along it. How hard a dwarf burns
// is how much the room has made of it, as before.
//
// The geometry of a disc of a given size is worked out once and kept. A body is painted again
// only when it has turned or changed enough to show.
const ALBEDO_W = 256;
const ALBEDO_H = 128;
// How much each channel dims at the limb, red to blue: the blue dims most.
const LIMB_DARKENING = [0.68, 0.8, 0.9];
// What each class of dwarf is made of. `granules` is how strongly the cells show, `spots` how
// many of them are marked, `faculae` how bright the patches around them are, `white` how far the
// centre runs toward white, `power` how much light it gives for its size: a white dwarf is the
// smallest and the most intense. A class not named here is drawn as a sun.
const STAR_TRAITS = {
  decision: { granules: 1, spots: 1, faculae: 1, white: 0.5, power: 1 },
  fact: { granules: 0.3, spots: 0, faculae: 0.35, white: 0.9, power: 1.35 },
  preference: { granules: 0.9, spots: 0.7, faculae: 0.9, white: 0.45, power: 1 },
  question: { granules: 0.7, spots: 0.4, faculae: 0.7, white: 0.65, power: 1.15 },
};
const SUN_TRAITS = { granules: 0.8, spots: 0.6, faculae: 0.8, white: 0.5, power: 1 };
// And what a memory's standing does to that surface. A dwarf you confirmed is clean; one nobody
// has judged carries its class's spots; one held as false is blotched, the spots spreading as
// `reach` drops; one put out of circulation is the worst of all. `faculae` scales the bright
// patches. A dwarf the archive has never once carried is cooling: its granules barely move, it
// gives less light (`glow`) and its middle is no longer white-hot (`white`).
const SURFACE_BY_ZONE = {
  bridge: { spots: 0, reach: 0.77, faculae: 1.3 },
  hold: { spots: 1, reach: 0.77, faculae: 1 },
  medbay: { spots: 1, reach: 0.67, faculae: 0.55, sick: true },
  jettisoned: { spots: 1, reach: 0.62, faculae: 0.3, sick: true },
};
const COLD_GRANULES = 0.3;
const COLD_GLOW = 0.55;
const COLD_WHITE = 0.2;
function surfaceOf(memory, traits = SUN_TRAITS, cold = false) {
  const zone = SURFACE_BY_ZONE[memory?.zone ?? 'hold'] ?? SURFACE_BY_ZONE.hold;
  return {
    spots: zone.sick ? 1 : traits.spots * zone.spots,
    reach: zone.reach,
    faculae: traits.faculae * zone.faculae,
    granules: traits.granules * (cold ? COLD_GRANULES : 1),
    glow: cold ? COLD_GLOW : 1,
    white: cold ? COLD_WHITE : 1,
  };
}
const dwarfAlbedos = new Map();
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
function gradientNoise(x, y, z) {
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
function fractalNoise(x, y, z, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i += 1) { sum += amp * gradientNoise(x * freq, y * freq, z * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, (sum / norm) * 1.6));
}
// Cellular noise: the distance to the nearest and the second nearest of a scatter of points,
// one jittered into each unit cell. Where the two are nearly equal is the border between two
// cells, which is exactly the shape of a granule's dark lane.
function cellNoise(x, y, z) {
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

// The whole surface of one class: how bright the granulation is at each texel, and how strong
// the magnetic field is there. Spots and faculae are read from the field when a dwarf is
// painted, so how many a dwarf shows can follow the memory's standing instead of being baked in.
// Each class has a surface of its own. Built a band of rows at a time when asked to be (`rows`),
// so the work can be spread over frames; the map is handed out only once it is whole.
function dwarfAlbedo(kind, rows = ALBEDO_H) {
  let build = dwarfAlbedos.get(kind);
  if (build?.done) return build.map;
  if (!build) {
    const offset = [...String(kind)].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) * 0.37;
    build = { offset, map: new Float32Array(ALBEDO_W * ALBEDO_H * 2), next: 0, done: false };
    dwarfAlbedos.set(kind, build);
  }
  const { offset, map } = build;
  const until = Math.min(ALBEDO_H, build.next + rows);
  for (let row = build.next; row < until; row += 1) {
    const lat = ((row + 0.5) / ALBEDO_H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let col = 0; col < ALBEDO_W; col += 1) {
      const lon = ((col + 0.5) / ALBEDO_W) * Math.PI * 2;
      const px = cl * Math.cos(lon) + offset, py = sl, pz = cl * Math.sin(lon);
      // Granules: bright where a cell's middle is, dark along the lanes between cells, and a
      // slow unevenness over the lot so no two stretches of the surface match.
      const drift = fractalNoise(px * 3 + 4, py * 3, pz * 3, 3) - 0.5;
      const [near, next] = cellNoise(px * 21 + drift, py * 21, pz * 21 - drift);
      const lane = smooth(0, 0.32, next - near);
      const middle = 1 - Math.min(1, near * 0.9);
      const granule = 0.5 + 0.5 * (lane * (0.6 + 0.4 * middle) - 0.55) + 0.18 * (fractalNoise(px * 6, py * 6 + 2, pz * 6, 3) - 0.5);
      // The field: where it is strongest, spots; in a ring around them, faculae.
      const field = fractalNoise(px * 2.3 + 11, py * 2.3, pz * 2.3, 4) + 0.06 * (fractalNoise(px * 9, py * 9, pz * 9, 2) - 0.5);
      const at = (row * ALBEDO_W + col) * 2;
      map[at] = Math.min(1, Math.max(0, granule));
      map[at + 1] = field;
    }
  }
  build.next = until;
  build.done = until >= ALBEDO_H;
  return build.done ? map : null;
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

// The shading itself. Pure: a table, a map and the star in, RGBA out. `colour` is the class's
// colour as three numbers 0..1, `surface` what its standing does to it (surfaceOf), `turn` how
// far the body has spun, `burn` how hard it burns.
function shadeDwarf(out, table, map, { colour, traits = SUN_TRAITS, surface = surfaceOf(null, traits), turn, burn }) {
  out.fill(0);
  const shift = (((turn / (Math.PI * 2)) % 1) + 1) % 1 * ALBEDO_W;
  const energy = (0.62 + 0.62 * burn) * (traits.power ?? 1);
  const whiten = traits.white * (0.5 + 0.5 * burn);
  // Toward the edge the class's colour deepens: cooler gas, the same hue, more of it.
  const deep = colour.map((value) => value ** 1.6);
  const cells = table.cells;
  const sample = new Float32Array(2);
  const { spots, reach, faculae, granules } = surface;
  const energyNow = energy * (surface.glow ?? 1);
  const whitenNow = whiten * (surface.white ?? 1);
  for (let i = 0; i < cells.length; i += 7) {
    const mu = cells[i + 3];
    // Read between texels, never from one: the map is smaller than a close-up body, and a body
    // read texel by texel shows them as squares.
    const u = cells[i + 4] + shift;
    const u0 = Math.floor(u);
    const fu = u - u0;
    const c0 = ((u0 % ALBEDO_W) + ALBEDO_W) % ALBEDO_W;
    const c1 = (c0 + 1) % ALBEDO_W;
    const v = cells[i + 5];
    const r0 = Math.floor(v);
    const fv = v - r0;
    const r1 = Math.min(ALBEDO_H - 1, r0 + 1);
    for (let k = 0; k < 2; k += 1) {
      const top = map[(r0 * ALBEDO_W + c0) * 2 + k] * (1 - fu) + map[(r0 * ALBEDO_W + c1) * 2 + k] * fu;
      const bottom = map[(r1 * ALBEDO_W + c0) * 2 + k] * (1 - fu) + map[(r1 * ALBEDO_W + c1) * 2 + k] * fu;
      sample[k] = top * (1 - fv) + bottom * fv;
    }
    const [granule, field] = sample;
    // Spots where the field passes `reach`, umbra deeper in; faculae in the ring just short of it.
    const ring = smooth(reach, reach + 0.07, field);
    const umbra = smooth(reach + 0.07, reach + 0.12, field) * spots;
    const penumbra = ring * spots;
    const facula = Math.max(0, smooth(reach - 0.11, reach - 0.01, field) - ring) * faculae;
    // The cells foreshorten toward the limb and their contrast goes with them.
    const cells_ = 1 + granules * 0.62 * (granule - 0.5) * Math.sqrt(mu);
    const bright = 1 + 0.6 * facula * (1 - mu) ** 0.7;
    const dark = 1 - 0.8 * umbra - 0.4 * Math.max(0, penumbra - umbra);
    // White-hot in the middle, its own colour toward the edge, deepening at the limb.
    const heat = whitenNow * mu * mu;
    const edge = (1 - mu) ** 1.5;
    const p = cells[i] * 4;
    for (let k = 0; k < 3; k += 1) {
      const hue = colour[k] + (deep[k] - colour[k]) * edge;
      const tint = hue + (1 - hue) * heat;
      const limb = 1 - LIMB_DARKENING[k] * (1 - mu);
      const value = tint * limb * cells_ * bright * dark * energyNow;
      out[p + k] = 255 * (1 - Math.exp(-value * 2.6));
    }
    out[p + 3] = 255 * cells[i + 6];
  }
  return out;
}

// One dwarf's painted face, kept on its node and painted again only when it has changed enough
// to be seen. Null where there is no pixel buffer to paint into, and the body is drawn the
// older way instead.
//
// What it costs is bounded per frame. A surface map is built one class a frame, so opening the
// map never stalls; until its class is ready a dwarf is drawn the older way. And only so many
// faces are painted again each frame, in the order they are drawn; the rest keep last frame's
// face for one more, which at the pace these bodies turn nobody can tell from a fresh one.
const SHADE_BUDGET = 28;
const ALBEDO_ROWS_PER_FRAME = 12;

// ---- MOTHER's body, as molten rock.
//
// A crust of cooling rock, nearly black, broken into plates; between the plates, cracks running
// white-hot; under the crust, pools where it has melted through and the lava shows. The crust
// rides the body's turn, the lava underneath flows at a pace of its own, and where the two
// disagree the surface looks like it is moving rather than painted. Every so often something
// bursts inside: a flash, a white core, a ring of fire running out from it and fading.
//
// The map is built once, the way the dwarfs' are, a band at a time; what changes frame to frame
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

// Whether the slow textures are whole: MOTHER's crust and the surface of each class of dwarf. They
// are built a band at a time, shared by every scene; a scene painted before they are whole draws
// its bodies the older way, and the Macroverso paints its sprites once more when this turns true.
export function texturesReady() {
  return Boolean(magmaBuild.done) && Object.keys(MEMORY_COLORS).every((kind) => kind === COLLAPSED || dwarfAlbedos.get(kind)?.done);
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
  return { cells, links };
})();
// The bulb, drawn at (x, y) with radius R in whatever space the context is in; `px` is one css
// pixel in that space. It turns slowly on its own besides the scene's turn, beats with the heart,
// answers when pulses come home (`lit`), flushes red in an alarm, and flashes as the mode comes on.
export function drawNeuralBulb(ctx, x, y, R, t, { yaw = 0, pitch = 0, beat = 0, lit = 0, alarm = 0, px = 1, light = 1, ignite = 1, tone = 'mother', still = false } = {}) {
  const colours = BULB_TONES[tone] ?? BULB_TONES.mother;
  const turn = yaw + (still ? 0 : t * 0.07);
  const cy = Math.cos(turn), sy = Math.sin(turn), cp = Math.cos(pitch * 0.6), sp = Math.sin(pitch * 0.6);
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
  // The cells, the near side brighter, the heart swelling on the beat.
  for (const point of at) {
    const inner = 1 - point.cell.out;
    const size = (3 + 2.6 * point.front + 2.4 * inner * beat) * px * (1 + 0.6 * flash);
    const hex = alarm ? colours.alarm : colours[point.cell.tone];
    ctx.globalAlpha = Math.min(1, (0.3 + 0.55 * point.front) * energy);
    ctx.drawImage(neuronGlow(hex), point.x - size, point.y - size, size * 2, size * 2);
  }
  // The nucleus: one wide soft light at the centre.
  const heart = R * (0.62 + 0.08 * beat + 0.4 * flash);
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
    const step = Math.min(1, FOCUS_TURN * dt);
    nostromo.yaw = yaw + short * step;
    nostromo.pitch = (nostromo.pitch ?? 0) + (pitchTo - (nostromo.pitch ?? 0)) * step;
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

  function dwarfSprite(node, radius, burn, pixels, frame) {
    if (typeof ImageData !== 'function') return null;
    if (shading.frame !== frame) { shading.frame = frame; shading.painted = 0; shading.built = false; }
    const size = Math.max(8, Math.min(200, 2 * Math.round(radius * pixels)));
    const kind = node.memory.kind;
    if (!dwarfAlbedos.get(kind)?.done) {
      if (shading.built) return null;
      shading.built = true;
      if (!dwarfAlbedo(kind, ALBEDO_ROWS_PER_FRAME)) return null;
    }
    const map = dwarfAlbedo(kind);
    const colour = [1, 3, 5].map((at) => Number.parseInt(String(node.color).slice(at, at + 2), 16) / 255);
    if (colour.some((value) => !Number.isFinite(value))) return null;
    let sprite = node.sprite;
    // A body that has never been painted at this size waits its turn like any other: when a whole
    // class becomes ready at once it is introduced a few dozen a frame, not all in one.
    if ((!sprite || sprite.size !== size) && shading.painted >= SHADE_BUDGET) return sprite?.canvas ?? null;
    if (!sprite || sprite.size !== size) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const paint = canvas.getContext('2d');
      if (!paint?.createImageData) return null;
      sprite = node.sprite = { canvas, paint, image: paint.createImageData(size, size), size, turn: NaN, burn: -1, colour: '', standing: '' };
    }
    const turn = node.spin * 0.3 + node.seed;
    // Painted again once the middle of its face has moved half a pixel, so a small body is painted
    // rarely and a large one, close up, as often as it needs.
    const fresh = !(sprite.turn === sprite.turn);
    const traits = STAR_TRAITS[kind] ?? SUN_TRAITS;
    const standing = `${node.memory.zone ?? 'hold'}${node.cold ? ':cold' : ''}`;
    const moved = fresh
      || Math.abs(turn - sprite.turn) * size > 1
      || Math.abs(burn - sprite.burn) > 0.04
      || sprite.colour !== node.color
      || sprite.standing !== standing;
    if (moved && shading.painted < SHADE_BUDGET) {
      shading.painted += 1;
      shadeDwarf(sprite.image.data, sphereTable(size), map, { colour, traits, surface: surfaceOf(node.memory, traits, Boolean(node.cold)), turn, burn });
      sprite.paint.putImageData(sprite.image, 0, 0);
      sprite.turn = turn;
      sprite.burn = burn;
      sprite.colour = node.color;
      sprite.standing = standing;
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
    // rate, and the frames between are free for the dwarfs.
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
      for (const node of nodes) node.spin = (node.spin ?? node.seed) + dt * 0.012 * (1 + (node.seed % 1));
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
      const micro = 1 + 0.05 * Math.sin(t * node.rate + node.seed);
      // Never smaller than a point and a half on screen, while it is there at all.
      const r = node.scale > 0.01 ? Math.max(node.r * node.scale * micro, 1.5 / cam.scale) : 0;
      if (r <= 0) return;
      const arrive = Math.min(1.2, node.lit ?? 0);
      // Two things decide how brightly a dwarf burns. Maturity is what the room has made of it
      // over time: how often it has been reached for, how lately, how woven into the rest. Feeding
      // is what it is being given right now, by MOTHER and by its neighbours at once. A young
      // memory nobody feeds is nearly out; an old one the room leans on runs white.
      const grown = node.activity ?? 0;
      const fed = Math.min(1, (node.charge ?? 0) + 0.25 * arrive);
      const burn = Math.min(1, 0.4 * grown + 0.75 * fed);

      // A collapsed body. This one is not a star and it is not a furnace either: it is a claim the
      // room established is false, and what it looks like is absence. A round black nothing, the
      // dust and stars of the field standing around it, and the faint cold light of what passes
      // close enough to be bent round the rim instead of going straight.
      //
      // There is no disc and nothing burns. The whole of it is the dark, and the dark is the point.
      if (node.memory.kind === COLLAPSED) {
        const hole = r * 1.35;
        const field = hole * 2.4;
        const turn = node.seed + node.spin * 0.12;
        const lit = 0.45 + 0.55 * burn;

        // Seen from far, the field of dust and the arcs are smaller than a pixel and only smear
        // into a grey stain round a black blot. A small void reads by what it is: a dark point with
        // one thin cold rim of bent light, its colour the kind's.
        if (hole * cam.scale < 9) {
          ctx.fillStyle = 'rgba(0, 0, 3, .92)';
          ctx.beginPath(); ctx.arc(node.x, node.y, hole, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = hexAlpha(hexMix(node.color, '#a8ccff', 0.55), (0.45 + 0.35 * lit) * glowAt);
          ctx.lineWidth = 1 / cam.scale;
          ctx.beginPath(); ctx.arc(node.x, node.y, hole + 0.6 / cam.scale, 0, Math.PI * 2); ctx.stroke();
          if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, hole * 1.6, t, cam.scale);
          return;
        }

        // The field it sits in: specks of dust and far stars, each on its own slow flicker.
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < VOID_DUST.length; i += 1) {
          const speck = VOID_DUST[i];
          const at = hole * 1.06 + (field - hole * 1.06) * speck.out;
          const angle = speck.angle + turn;
          const x = node.x + Math.cos(angle) * at;
          const y = node.y + Math.sin(angle) * at;
          // Fading outward, so the field thins into the dark rather than stopping.
          const fade = (1 - speck.out * 0.72) * lit * (0.45 + 0.55 * Math.abs(Math.sin(t * speck.rate + speck.phase)));
          const size = speck.size * (1 + 0.25 * burn) / cam.scale;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
          glow.addColorStop(0, `rgba(${speck.colour}, ${fade})`);
          glow.addColorStop(0.35, `rgba(${speck.colour}, ${fade * 0.3})`);
          glow.addColorStop(1, `rgba(${speck.colour}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(x, y, size * 3.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // The void. Black all the way through, with just enough softness at the rim that it reads
        // as depth rather than as a sticker.
        const pit = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, hole * 1.1);
        pit.addColorStop(0, 'rgba(0, 0, 0, 1)');
        pit.addColorStop(0.86, 'rgba(0, 0, 0, 1)');
        pit.addColorStop(0.95, 'rgba(0, 0, 2, .82)');
        pit.addColorStop(1, 'rgba(0, 0, 4, 0)');
        ctx.fillStyle = pit;
        ctx.beginPath(); ctx.arc(node.x, node.y, hole * 1.1, 0, Math.PI * 2); ctx.fill();

        // What passes close enough is bent round instead of going straight: a cold ring of
        // smeared light gripping the rim, in a few arcs that do not quite close.
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(node.x, node.y, hole * 0.94, node.x, node.y, hole * 1.3);
        halo.addColorStop(0, 'rgba(150, 190, 255, 0)');
        halo.addColorStop(0.3, `rgba(168, 204, 255, ${0.26 * lit})`);
        halo.addColorStop(0.55, `rgba(120, 160, 230, ${0.12 * lit})`);
        halo.addColorStop(1, 'rgba(90, 130, 210, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(node.x, node.y, hole * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round';
        for (let arc = 0; arc < 4; arc += 1) {
          const at = hole * (1.005 + arc * 0.028);
          const from = turn * (1 + arc * 0.35) + arc * 1.9;
          const span = 0.9 + 0.5 * Math.sin(t * 0.21 + arc);
          ctx.strokeStyle = `rgba(${arc % 2 ? '198, 222, 255' : '146, 186, 250'}, ${(0.3 - 0.05 * arc) * lit})`;
          ctx.lineWidth = (1.4 - 0.25 * arc) / cam.scale;
          ctx.beginPath(); ctx.arc(node.x, node.y, at, from, from + span); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, field, t, cam.scale);
        return;
      }

      // Drawn pixel by pixel wherever there is a buffer to paint into.
      const sprite = dwarfSprite(node, node.r * node.scale, burn, cam.scale * dpr, t);
      if (sprite) ctx.drawImage(sprite, node.x - r, node.y - r, r * 2, r * 2);
      else {
        ctx.save();
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.closePath();
        // The ground, struck from the body's own middle: a star is not lit from a corner. It runs
        // white at the centre the harder it burns and keeps its class's colour outward.
        const ground = ctx.createRadialGradient(node.x, node.y, r * 0.03, node.x, node.y, r);
        ground.addColorStop(0, hexMix(node.color, '#ffffff', 0.5 + 0.5 * burn));
        ground.addColorStop(0.45, hexMix(node.color, '#ffffff', 0.12 + 0.4 * burn));
        ground.addColorStop(0.85, hexMix(node.color, '#000000', 0.2 - 0.2 * burn));
        ground.addColorStop(1, hexMix(node.color, '#000000', 0.34 - 0.24 * burn));
        ctx.fillStyle = ground;
        ctx.fill();
        ctx.clip();
        // The face: the boiling surface a star of this class has, turning slowly, laid over the
        // whole body. This is most of what is seen, so it is laid down at close to full strength.
        const face = dwarfTexture(node.color);
        if (face) {
          // Wrapped on a sphere, half the strip across the visible face, in columns that narrow
          // toward the limb: the cells slide in from one edge, cross wide and leave thin, which is
          // what reads as a body turning rather than a picture sliding behind a hole.
          const strip = face.width / 2;
          const turn = ((node.spin * 0.3 + node.seed) / (Math.PI * 2) % 1 + 1) % 1;
          ctx.globalAlpha = 0.72 + 0.26 * burn;
          for (let column = 0; column < SKIN_COLUMNS; column += 1) {
            const x0 = SKIN_EDGES[column];
            const x1 = SKIN_EDGES[column + 1];
            ctx.drawImage(face, (turn + column / (SKIN_COLUMNS * 2)) * strip, 0, strip / (SKIN_COLUMNS * 2), face.height,
              node.x + x0 * r * 1.06, node.y - r * 1.06, Math.max(0.5, (x1 - x0) * r * 1.06), r * 2.12);
          }
          ctx.globalAlpha = 1;
        }
        // The hottest of it burns through the face, the way an active region does.
        ctx.globalCompositeOperation = 'lighter';
        const core = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 0.92);
        core.addColorStop(0, hexAlpha(hexMix(node.color, '#ffffff', 0.9), 0.2 + 0.45 * burn));
        core.addColorStop(0.5, hexAlpha(hexMix(node.color, '#ffffff', 0.5), 0.08 + 0.2 * burn));
        core.addColorStop(1, hexAlpha(node.color, 0));
        ctx.fillStyle = core;
        ctx.fillRect(node.x - r, node.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // The glow: the light a star gives off, clinging to it in a tight bloom the width of a finger,
      // the same all the way round because nothing else is lighting it. It carries past the body
      // and stops there, so it belongs to the star rather than hanging off it.
      ctx.globalCompositeOperation = 'lighter';
      const air = ctx.createRadialGradient(node.x, node.y, r * 0.99, node.x, node.y, r * 1.42);
      // It starts at the limb, never over it, and no brighter than the limb itself: scattered
      // light falling away from the body, with no seam and no ring. A cooling dwarf gives less of
      // it, in the same proportion its face has dimmed.
      const cooling = node.cold ? COLD_GLOW : 1;
      air.addColorStop(0, hexAlpha(hexMix(node.color, '#ffffff', 0.2 + 0.3 * burn), ((0.16 + 0.34 * burn) * cooling + 0.2 * arrive) * glowAt));
      air.addColorStop(0.25, hexAlpha(hexMix(node.color, '#ffffff', 0.1 + 0.2 * burn), ((0.07 + 0.16 * burn) * cooling + 0.1 * arrive) * glowAt));
      air.addColorStop(1, hexAlpha(node.color, 0));
      ctx.fillStyle = air;
      ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.34, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      if (node === nostromo.hover && !nostromo.selected) drawSight(ctx, node.x, node.y, r * 1.1, t, cam.scale);
      };
    const ordered = [...nostromo.nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    for (const node of ordered) if ((node.depth ?? 0) < 0) drawMemory(node);

    // ---- MOTHER's core: a body, not a disc.
    //
    // Everything on the surface lives at a latitude and a longitude and is projected before it
    // is drawn, so it narrows toward the limb and goes round the back as the planet turns.
    // Three cues do the work: features that travel on a real sphere, an edge that darkens into
    // shadow, and one fixed light that decides which side is day. The planet turns; the sun
    // stays where it is.
    // The human's hand turns the star with the body around it: the turn adds to its longitude and
    // the tip to its lean, in the same order the memories are projected in.
    const yaw = nostromo.yaw ?? 0;
    const sinT = Math.sin(CORE_TILT + (nostromo.pitch ?? 0));
    const cosT = Math.cos(CORE_TILT + (nostromo.pitch ?? 0));
    const spin = nostromo.spin ?? 0;
    // A point on the surface: where it lands on screen, how much it faces us, what light it takes.
    const surface = (lat, lon) => {
      const cl = Math.cos(lat);
      const px = cl * Math.sin(lon);
      const py = Math.sin(lat);
      const pz = cl * Math.cos(lon);
      const y = py * cosT - pz * sinT;
      const z = py * sinT + pz * cosT;
      return { x: px, y, z, light: Math.max(0, px * CORE_LIGHT.x + y * CORE_LIGHT.y + z * CORE_LIGHT.z) };
    };

    // ---- What the star sits in.
    //
    // No wide halo. A body this size does not need a cloud around it to be felt, and a soft
    // smudge only makes it look smaller. What surrounds it is darkness: one tight, fierce skin of
    // light gripping the limb and falling away almost at once, and beyond that a deep red stain
    // so faint it reads as the dark being lit rather than as anything drawn.
    const stain = ctx.createRadialGradient(0, 0, R, 0, 0, R * 4.6);
    stain.addColorStop(0, `rgba(122, 12, 6, ${0.3 + 0.08 * beat})`);
    stain.addColorStop(0.24, `rgba(88, 6, 6, ${0.14 + 0.04 * beat})`);
    stain.addColorStop(0.62, 'rgba(46, 2, 6, .05)');
    stain.addColorStop(1, 'rgba(20, 0, 4, 0)');
    ctx.fillStyle = stain;
    ctx.beginPath(); ctx.arc(0, 0, R * 4.6, 0, Math.PI * 2); ctx.fill();

    // ---- The body: a star, dark and molten.
    //
    // A star makes its own light, so it has no day side, no night side and no highlight struck
    // off it by something else. This one is not a bright disc either: it burns deep, almost
    // black at the limb, and what moves on it is liquid rock. The skin is a strip of boiling
    // cells built once and wrapped round the body; a second pass of the same strip, sliding at a
    // different rate, makes the two disagree, and that disagreement is what reads as flow. Over
    // both, masses of molten matter drift across the face at a walking pace.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.closePath();
    ctx.shadowColor = `rgba(220, 44, 12, ${0.55 + 0.2 * beat})`;
    ctx.shadowBlur = 40 + 26 * beat;
    const body = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R);
    body.addColorStop(0, `hsl(${14 + 5 * beat} 100% ${28 + 8 * beat}%)`);
    body.addColorStop(0.58, 'hsl(9 100% 20%)');
    body.addColorStop(1, 'hsl(5 100% 10%)');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();

    // Molten rock, painted pixel by pixel wherever there is a buffer to paint into: plates of
    // crust, cracks running white-hot, lava flowing under them, bursts going off inside.
    const magma = magmaFace(R, cam.scale * dpr, t, { turn: spin - yaw, beat, alarm, reduced: nostromo.reduced, tilt: nostromo.pitch ?? 0 });
    if (magma) ctx.drawImage(magma, -R, -R, R * 2, R * 2);
    else {
      // The skin, wrapped on. Each row of the disc takes the slice of the strip belonging to its
      // latitude, cut into pieces so longitude runs as a sphere's does and the cells narrow toward
      // the limb instead of smearing along it. Turning the star is moving the window along.
      // Someone who asked for stillness gets a star that turns and breathes but does not churn.
      const flowTime = nostromo.reduced ? 0 : t;
      const grain = granuleTexture();
      if (grain) {
        const width = grain.width / 2;
        const wrapAt = (turn, alpha, lift) => {
          ctx.globalAlpha = alpha;
          for (let row = 0; row < GRAIN_ROWS; row += 1) {
            const y0 = -R + (row / GRAIN_ROWS) * 2 * R;
            const y1 = -R + ((row + 1) / GRAIN_ROWS) * 2 * R;
            const mid = (y0 + y1) * 0.5;
            const half = Math.sqrt(Math.max(0, R * R - mid * mid));
            if (half < 0.5) continue;
            const v0 = (((y0 + R) / (2 * R) + lift) % 1 + 1) % 1 * grain.height;
            const dv = Math.max(1, ((y1 - y0) / (2 * R)) * grain.height);
            for (let piece = 0; piece < GRAIN_PIECES; piece += 1) {
              const xA = Math.sin((piece / GRAIN_PIECES - 0.5) * Math.PI) * half;
              const xB = Math.sin(((piece + 1) / GRAIN_PIECES - 0.5) * Math.PI) * half;
              const u = (turn + (piece / GRAIN_PIECES) * 0.5) * width;
              ctx.drawImage(grain, u, Math.min(v0, grain.height - dv), (width * 0.5) / GRAIN_PIECES, dv, xA, y0, Math.max(0.5, xB - xA), Math.max(1, y1 - y0));
            }
          }
          ctx.globalAlpha = 1;
        };
        // Advancing the window carries the skin from right to left, so a turn of the hand to the
        // right carries it back the other way, with the memories.
        const turn = (((spin - yaw) / (Math.PI * 2)) % 1 + 1) % 1;
        wrapAt(turn, 0.95, 0);
        // The same skin again, crawling at its own pace: where the two pull apart the surface
        // churns, and that is the slowness of lava rather than the flicker of fire.
        ctx.globalCompositeOperation = 'lighter';
        wrapAt(((turn * 0.83 + flowTime * 0.0042) % 1 + 1) % 1, 0.32, 0.37);
        ctx.globalCompositeOperation = 'source-over';
      }

      // Masses of molten matter riding the surface. They are slow, they are large, and each keeps
      // its own drift, so the face is never the same face twice.
      for (let i = 0; i < CORE_FLOWS.length; i += 1) {
        const flow = CORE_FLOWS[i];
        // The masses ride the same way the skin turns. They used to travel against it, and the two
        // motions cancelled into a surface that churned in place instead of turning.
        const p = surface(flow.lat + 0.1 * Math.sin(flowTime * flow.rate * 0.6 + i), flow.lon - spin * 0.96 + yaw + flowTime * flow.drift);
        if (p.z <= 0.02) continue;
        const swell = 0.62 + 0.38 * Math.sin(flowTime * flow.rate + i * 1.7);
        const fade = Math.min(1, p.z * 2.3) * swell;
        ctx.save();
        ctx.translate(p.x * R, p.y * R);
        ctx.rotate(Math.atan2(p.y, p.x));
        ctx.scale(Math.max(0.05, p.z), 1);
        const molten = ctx.createRadialGradient(0, 0, 0, 0, 0, R * flow.size);
        molten.addColorStop(0, `rgba(255, ${flow.hot ? 214 : 96}, ${flow.hot ? 132 : 30}, ${(flow.hot ? 0.46 : 0.2) * fade})`);
        molten.addColorStop(0.42, `rgba(${flow.hot ? '255, 122, 36' : '176, 34, 10'}, ${(flow.hot ? 0.24 : 0.14) * fade})`);
        molten.addColorStop(1, 'rgba(120, 16, 8, 0)');
        ctx.fillStyle = molten;
        ctx.beginPath(); ctx.arc(0, 0, R * flow.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Limb darkening, hard. Looking at the edge of a star means looking through far more of its
      // own gas, and on a body this dark the edge goes almost to black. This is the whole of the
      // illusion: it is what gives the thing its weight.
      const limb = ctx.createRadialGradient(0, 0, R * 0.34, 0, 0, R);
      limb.addColorStop(0, 'rgba(0, 0, 0, 0)');
      limb.addColorStop(0.58, `rgba(96, 8, 4, ${0.3 - 0.05 * beat})`);
      limb.addColorStop(0.85, `rgba(50, 2, 4, ${0.62 - 0.08 * beat})`);
      limb.addColorStop(1, `rgba(14, 0, 2, ${0.9 - 0.1 * beat})`);
      ctx.fillStyle = limb;
      ctx.fillRect(-R, -R, R * 2, R * 2);
    }
    ctx.restore();

    // Prominences: arches of matter torn off the limb, standing up and falling back. Few, large
    // and slow. A star this size does not flicker; it heaves.
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i += 1) {
      const base = i * 1.5708 + t * 0.05;
      const spread = 0.28 + 0.1 * Math.sin(t * 0.37 + i);
      const lift = R * (0.2 + 0.26 * Math.abs(Math.sin(t * 0.21 + i * 1.7)) + 0.3 * alarm);
      const x0 = Math.cos(base - spread) * R * 0.99, y0 = Math.sin(base - spread) * R * 0.99;
      const x1 = Math.cos(base + spread) * R * 0.99, y1 = Math.sin(base + spread) * R * 0.99;
      const cxp = Math.cos(base) * (R + lift * 2.1), cyp = Math.sin(base) * (R + lift * 2.1);
      // A wide dull body of matter with a thin hot thread running through it.
      ctx.strokeStyle = `rgba(190, 34, 14, ${0.2 + 0.14 * Math.abs(Math.sin(t * 0.6 + i))})`;
      ctx.lineWidth = (5.5 + 3 * beat) / cam.scale;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cxp, cyp, x1, y1); ctx.stroke();
      ctx.strokeStyle = `rgba(255, ${128 + 70 * beat}, ${64 + 60 * beat}, ${0.3 + 0.28 * Math.abs(Math.sin(t * 0.6 + i))})`;
      ctx.lineWidth = (1.5 + 0.9 * beat) / cam.scale;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cxp, cyp, x1, y1); ctx.stroke();
    }

    // The limb. One fierce skin of light gripping the edge, gone within a fraction of a radius:
    // it is what separates the body from the dark, and it holds the whole shape together. It is
    // also what answers when a pulse comes home.
    const home = Math.min(1, nostromo.coreLit ?? 0);
    const fierce = 0.55 + 0.35 * beat + 0.4 * home;
    ctx.globalCompositeOperation = 'lighter';
    const edge = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.22);
    edge.addColorStop(0, 'rgba(255, 96, 34, 0)');
    edge.addColorStop(0.42, `rgba(255, ${132 + 60 * beat}, 62, ${0.5 * fierce})`);
    edge.addColorStop(0.52, `rgba(255, ${176 + 60 * beat}, ${110 + 60 * beat}, ${0.62 * fierce})`);
    edge.addColorStop(1, 'rgba(210, 40, 16, 0)');
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(255, ${186 + 60 * beat}, ${128 + 80 * beat}, ${Math.min(0.92, 0.7 * fierce)})`;
    ctx.lineWidth = (1.2 + 1.2 * beat + 1.1 * home) / cam.scale;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

    // ---- Memories: dwarf stars.
    //
    // A dwarf makes its own light, so none of it is in shadow. Its face boils with granules, it
    // dims toward the limb the way every star does, and what light escapes clings to it in a tight
    // bloom the width of a finger. On top of that each breathes at a rate of its own: a
    // micro-pulsation, small enough that it is never a flash and never in time with its neighbours.
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
  function drawNeural(t) {
    const ctx = nostromo.canvas.getContext('2d');
    const { w, h, dpr } = nostromo.size;
    const cam = nostromo.cam;
    const { beat } = heartbeat(t);
    const alarm = nostromo.alarm ? Math.max(0, 1 - (t - nostromo.alarm) / 3.6) : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!nostromo.bare) neuralGround(ctx, w, h, beat);
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
    ctx.strokeStyle = `rgba(${NEURAL_AXON}, ${0.13 * farLight * reveal})`;
    ctx.lineWidth = 0.8 * px;
    ctx.beginPath();
    for (const node of nodes) if (!node.forgetting && shown(node) > 0) { ctx.moveTo(node.rimX, node.rimY); ctx.quadraticCurveTo(node.cx, node.cy, node.x, node.y); }
    ctx.stroke();
    ctx.strokeStyle = `rgba(${NEURAL_AXON}, ${0.24 * farLight * reveal})`;
    ctx.lineWidth = 0.9 * px;
    ctx.beginPath();
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b || shown(a) <= 0 || shown(b) <= 0) continue;
      ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(link.cx, link.cy, b.x, b.y);
    }
    ctx.stroke();
    // A synapse whose neurons are lit answers in their colours.
    for (const link of nostromo.links) {
      const a = byId.get(link.a);
      const b = byId.get(link.b);
      if (!a || !b) continue;
      const glow = Math.max(lightOf(a), lightOf(b)) * Math.min(shown(a), shown(b));
      if (glow < 0.12) continue;
      ctx.strokeStyle = hexAlpha(hexMix(a.color, b.color, 0.5), Math.min(0.7, 0.32 * glow) * farLight);
      ctx.lineWidth = (0.8 + 0.6 * Math.min(1, glow)) * px;
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
    // The central bulb.
    drawNeuralBulb(ctx, 0, 0, R, t, { yaw: (nostromo.spin ?? 0) * 0.2 - (nostromo.yaw ?? 0), pitch: nostromo.pitch ?? 0, beat, lit: nostromo.coreLit ?? 0, alarm, px, light: farLight, ignite, still: nostromo.reduced });
    // The neurons, each a point of light: brighter the more the room leans on it and the more is
    // reaching it now; one out of circulation stays a cold ember; a false claim is a dark ring.
    ctx.globalCompositeOperation = 'lighter';
    for (const node of nodes) {
      if (node.forgetting || node.scale <= 0.01) continue;
      const seen = shown(node);
      if (seen <= 0) continue;
      const near = 0.55 + 0.45 * Math.min(1, Math.max(0, ((node.depth ?? 0) + 700) / 1400));
      if (node.memory.kind === COLLAPSED) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = hexAlpha(hexMix(node.color, '#a8ccff', 0.4), 0.7 * seen * near * farLight);
        ctx.lineWidth = 1.1 * px;
        ctx.beginPath(); ctx.arc(node.x, node.y, 4.2 * px * farSize, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        continue;
      }
      const light = lightOf(node);
      const cold = !travels(node.memory);
      const colour = cold ? hexMix(node.color, '#2a3346', 0.6) : node.color;
      const size = (10 + 6 * (node.activity ?? 0) + 12 * Math.min(1, light)) * px * farSize * (0.6 + 0.4 * node.scale);
      ctx.globalAlpha = Math.min(1, (cold ? 0.4 : 0.66 + 0.26 * (node.activity ?? 0)) + 0.5 * Math.min(1, light)) * seen * near * farLight;
      ctx.drawImage(neuronGlow(colour), node.x - size, node.y - size, size * 2, size * 2);
    }
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
    nostromo.nodes = memories.map((memory, index) => {
      const sector = kinds.indexOf(memory.kind) < 0 ? 1 : kinds.indexOf(memory.kind);
      const angle = (sector / kinds.length) * Math.PI * 2 + ((index % 7) / 7 - 0.5) * (Math.PI / 2.4) + Math.random() * 0.2;
      const distance = 0.42 + Math.random() * 0.5;
      const span = Math.max(1, (memory.throughSequence ?? 0) - (memory.fromSequence ?? 0));
      // A far room sends how many sources a memory cites, not the list of them.
      const cited = memory.sources?.length ?? memory.sourcesCount ?? 0;
      return { memory, cold: memory.cold ?? null, angle, distance, activity: activityOf(raw[index], top), lit: 0, charge: 0, x: 0, y: 0, vx: 0, vy: 0, r: MEMORY_SCALE * (7 + Math.min(11, Math.log2(span + 1) * 2.2 + cited * 0.6)), scale: 1, seed: Math.random() * Math.PI * 2, rate: 0.5 + Math.random() * 0.9, color: travels(memory) ? (MEMORY_COLORS[memory.kind] ?? MEMORY_COLORS.fact) : hexMix(MEMORY_COLORS[memory.kind] ?? MEMORY_COLORS.fact, '#0b0f16', 0.52), placed: false };
    });
    return nostromo.nodes;
  }

  return {
    buildNodes, sizeNostromo, placeNostromo, stepNostromo, focusNostromo, projectNostromo, fitNostromo, drawNostromo, drawNebula, heartbeat, setNeural,
    toScreen, toWorld, nostromoLive, nostromoAt, beginImplosion, drawImplosion, drawDust, drawSight, dwarfSprite, magmaFace,
  };
}
