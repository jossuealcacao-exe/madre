// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// THE MACROVERSE: every room on this Mac as a NOSTROMO in open space (docs/MACROVERSO.md, phase 3a).
// It is entered from SALAS and only on a large screen; on a phone SALAS is the list and nothing more.
//
// Each room is drawn the way its own NOSTROMO is drawn, by the same engine (nostromo-engine.js):
// MOTHER of molten rock at the centre, every memory a dwarf in its kind's colour, the veins between
// those that share a theme. Far away, a universe is one scene placed and settled once, and from
// then on it lives without paying for its physics (`frozen`): it turns, MOTHER beats, and her
// pulses run out to its memories and between them. It is drawn at the size it shows on screen, so
// coming closer brings its detail and its light up; far ones share a few milliseconds a frame,
// turn by turn. Chosen, it is the real thing: one live scene, its physics and its magma running,
// composed over the space, and the whole space falls to black round it. Never more than one.
//
// The space is open: dragged, it moves; the wheel brings it closer; it has no edge. BISHOP stands
// at the origin (D-S12: the centre of the macroverse is the super agent), the open rooms orbit near
// it and the sleeping ones far and cold, and RECENTER brings it all home. A vein runs from BISHOP
// to every room it may read, because a contract says so, and nowhere else; a universe carried
// onto BISHOP asks for one. Dragging a chosen universe turns it in the hand, as in its room.
//
// What it costs: canvas 2D, no shaders. A sprite is never wider than SPRITE_MAX pixels and is
// painted again only when what it shows has changed; the live scene has one canvas of its own;
// frames run only while the macroverse is on screen, never in a hidden tab, and someone who asked
// for less motion gets one still frame redrawn when something changes. No line joins two universes
// until a link exists (phase 3c).

import { COLLAPSED, FOCUS_VEIL, MEMORY_COLORS, NEURAL_AXON, NEURAL_COLORS, NEURAL_CROSSFADE, NEURAL_IGNITION, PITCH_LIMIT, TURN_PER_PIXEL, alongCurve, collapsedChip, createNostromo, currentAlong, drawNeuralBulb, drawSun, dwarfChip, hexAlpha, hexMix, magmaMap, neuralGround, neuronChip, neuronGlow, sunOrb, texturesReady } from './nostromo-engine.js';
import { createStrain, inviteNeural, neuralKey, paintNeuralKey, tellViews } from './neural.js';
import { trazo } from './icons.js';

const KINDS = Object.keys(MEMORY_COLORS);
const TILT = 0.42;                 // how flat the orbits read: the plane seen a little from above
const INNER = 0.27, OUTER = 0.43;  // the orbits of open and sleeping rooms, as a share of the view
const TURN = (Math.PI * 2) / 900;  // a whole orbit in fifteen minutes: alive, never busy
const FOCUS_ZOOM = 2.1;            // how close the camera comes to a chosen universe
const ZOOM_MIN = 0.25, ZOOM_MAX = FOCUS_ZOOM * 1.5;
const SPRITE_MAX = 1024;           // the widest a sprite is ever painted, in pixels
const FAR_MEMORIES = 220;          // the most a far universe draws, the most alive first; its card says the rest
const FAR_TURN = 0.0016;           // radians a frame a far universe turns on its own
const FAR_FPS = 30;                // the most a far universe is drawn again in a second
const FAR_BUDGET = 7;              // ms a frame all the far universes may take between them
const SIDE_STEP = 1.3;             // a far universe's own canvas is resized only past this ratio
const SIDE_MIN = 96;               // nor ever smaller than this, in css px
const FOCUS_DARK = 0.62;           // how far the space falls to black round a chosen universe
const VEIN_AMBIENT = 0.45;         // pulses a second along a vein even when no crossing was counted
const MEMORY_WINDOWS = 4;          // memory windows open at once; the oldest gives way
const RELAX_STEPS = 60;            // steps of physics before a sprite is painted
const BODY_REACH = 520;            // world units from MOTHER to the edge of the brain, with room for its glow
const LIVE_SIDE = 760;             // css px of the live scene's own canvas
const LIVE_TURN = 0.0012;          // radians a frame a chosen universe turns on its own: a full turn in a minute and a half
const VEIN_PULSES = 48;            // a ceiling on pulses in flight along the veins, as NOSTROMO's
const VEIN_LIFE = 1.4;             // seconds a pulse takes from one universe to the other
const LINK_DRAG = 12;              // px a universe must be carried before it is being linked, not clicked

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const hash = (text) => { let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const random = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

const ORB_FPS = 30;                // the most the centre's sun is painted again in a second

// How big a universe reads at zoom 1, in css px of radius: the more it knows, the bigger
// (2026-10-28), plainly enough to tell one project from another, and never past a size that looks
// wrong beside the rest.
const REACH_SMALL = 52;
const REACH_BIG = 140;
const reachOf = (room) => Math.min(REACH_BIG, REACH_SMALL + 18 * Math.log2(1 + (room.glance?.census?.memories ?? 0) / 8));

// A scene for the engine: everything it reads, and nothing of a room's page. `bare`: no sky, no
// stars, no vignette — the space around it is this file's to draw.
function sceneFor(canvas, w, h, dpr, reduced) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const scene = {
    canvas, size: { w, h, dpr }, nodes: [], links: [], pulses: [], rings: [], lastPhase: 0, blasts: [],
    cam: { x: 0, y: 0, scale: 1, manual: false }, yaw: 0, pitch: 0, spin: 0, coreLit: 0,
    selected: null, hover: null, lock: null, witness: null, cage: null, alarm: null, altered: false,
    reduced, bare: true, coldOnly: false, maturity: 0, stage: null, words: null,
  };
  return { scene, engine: createNostromo(scene) };
}

// The memories a far universe draws: the most alive first, so a large archive is read by what the
// room leans on, and the veins between the ones kept.
function farMemories(data) {
  if ((data.memories?.length ?? 0) <= FAR_MEMORIES) return data;
  const alive = (memory) => (memory.recalled ?? 0) * 1e6 + (Date.parse(memory.lastRecalled ?? 0) || 0) / 1e9;
  const kept = [...data.memories].sort((a, b) => alive(b) - alive(a) || b.id - a.id).slice(0, FAR_MEMORIES);
  const ids = new Set(kept.map((memory) => memory.id));
  return { ...data, memories: kept, links: (data.links ?? []).filter((link) => ids.has(link.a) && ids.has(link.b)) };
}

// One universe painted once: its scene placed, settled and drawn into a sprite by the engine. A
// room that is asleep, sealed, outdated or unreachable is MOTHER alone: cold, or caged.
function paintUniverse(one, dpr, shown = null, neural = false) {
  const side = Math.min(SPRITE_MAX, Math.round(Math.max(SIDE_MIN, shown ?? one.reach * 2) * dpr));
  const css = side / dpr;
  const canvas = canvasOf(side, side);
  const { scene, engine } = sceneFor(canvas, css, css, dpr, true);
  const data = one.data;
  if (data?.memories?.length) {
    engine.buildNodes(farMemories(data));
    // Where the live scene left the bodies, if it had this universe: nothing jumps on the way back.
    if (one.settled) for (const node of scene.nodes) { const was = one.settled.get(node.memory.id); if (was) Object.assign(node, was, { placed: true }); }
    engine.placeNostromo();
    let t = 0;
    for (let step = 0; step < (one.settled ? 8 : RELAX_STEPS); step += 1) { t += 1 / 60; engine.stepNostromo(1, t); }
  }
  scene.cam = { x: 0, y: 0, scale: (css / 2 - 4) / BODY_REACH, manual: true };
  // The Coordinator's memories ride round the sun drawn here (sunOrb): its own core is not drawn.
  scene.noCore = Boolean(one.centre) && !neural;
  if (data?.sealed) scene.cage = { at: 0, closed: true };
  // Neural mode (public/neural.js): the universe drawn as a cluster of neurons round its bulb.
  scene.neural = neural;
  engine.projectNostromo();
  engine.drawNostromo(0.7);
  if (!one.room.open) {
    // A cold ember: the same body, the fire gone out of it.
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(52, 64, 88, .78)';
    ctx.fillRect(0, 0, side, side);
    ctx.globalCompositeOperation = 'source-over';
  }
  // From now on it lives: its bodies stay where they settled (no forces a frame), and it beats
  // and pulses unless someone asked for less motion. A sleeping room stays the ember it was.
  scene.frozen = true;
  scene.reduced = reducedMotion() || !one.room.open;
  return { canvas, css, ready: texturesReady(), scene, engine };
}

// A far universe drawn again at the size it now shows, when that has changed by more than a step:
// its own canvas and its camera follow, so close up it is sharp and far away it costs little.
function resizeUniverse(sprite, shown, dpr) {
  const side = Math.min(SPRITE_MAX, Math.round(Math.max(SIDE_MIN, shown) * dpr));
  const css = side / dpr;
  sprite.canvas.width = side;
  sprite.canvas.height = side;
  sprite.css = css;
  sprite.scene.size = { w: css, h: css, dpr };
  sprite.scene.cam.scale = (css / 2 - 4) / BODY_REACH;
}

// The ground: deep space and three slow glows, painted once per window size.
function paintNebula(width, height, dpr, accent) {
  const canvas = canvasOf(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#030305';
  ctx.fillRect(0, 0, width, height);
  for (const [x, y, radius, colour] of [[0.18, 0.2, 0.7, accent], [0.85, 0.15, 0.55, '#3dc6ff'], [0.55, 0.95, 0.8, '#ff2a1f']]) {
    const glow = ctx.createRadialGradient(width * x, height * y, 0, width * x, height * y, Math.max(width, height) * radius);
    glow.addColorStop(0, `${colour}26`);
    glow.addColorStop(1, `${colour}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas;
}

// A tile of stars: three of them, at three depths, slide under the camera at three speeds.
function paintStars(seed, count, biggest, dpr) {
  const side = 512;
  const canvas = canvasOf(side * dpr, side * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const pick = random(seed);
  for (let i = 0; i < count; i += 1) {
    const warm = pick() < 0.12;
    ctx.globalAlpha = 0.25 + pick() * 0.75;
    ctx.fillStyle = warm ? '#ffe2a8' : pick() < 0.3 ? '#b0ccff' : '#ffffff';
    ctx.beginPath(); ctx.arc(pick() * side, pick() * side, 0.3 + pick() * biggest, 0, Math.PI * 2); ctx.fill();
  }
  return { canvas, side };
}

export function openMacroverso({ host, rooms, here, enlaces = [], accent = '#34d399', accentInk = '#022c22', bishop = null, words, actions, neural: neuralStart = false }) {
  const reduced = reducedMotion();
  const layer = document.createElement('section');
  layer.className = 'mv';
  layer.setAttribute('aria-label', words.title);
  layer.style.setProperty('--mv-acc', accent);
  layer.style.setProperty('--mv-acc-ink', accentInk);
  const canvas = document.createElement('canvas');
  canvas.className = 'mv-canvas';
  canvas.tabIndex = 0;
  // Its head is the Memory map's (styles.css, .nostromo-head; 2026-10-10): the name in small mono,
  // what it holds in a line beside it, its keys at the end; the kinds of memory, as the same stars
  // (nostromo-engine.js, dwarfChip), along the bottom. The two maps read as one family.
  const head = document.createElement('header');
  head.className = 'mv-head nostromo-head';
  const title = document.createElement('h2');
  title.className = 'mother-title';
  title.textContent = words.title;
  const sub = document.createElement('span');
  sub.className = 'mother-sub';
  const legend = document.createElement('span');
  legend.className = 'nostromo-legend';
  legend.setAttribute('aria-label', words.legend ?? 'Memory kinds');
  // In the neural drawing each kind is the neuron the Memory map draws (2026-10-28): alive, going out
  // when it is not used, dead when it is doubtful (app.js, paintLegend).
  const paintLegend = (asNeurons) => {
    const chips = [];
    for (const [kind, hex] of Object.entries(MEMORY_COLORS)) {
      const chip = document.createElement('span');
      chip.className = `k ${kind}`;
      const said = document.createElement('i');
      said.textContent = words.kinds?.[kind] ?? kind;
      chip.append(asNeurons ? neuronChip(NEURAL_COLORS[kind] ?? hex, 16, kind === COLLAPSED ? 'dead' : 'alive') : kind === COLLAPSED ? collapsedChip(hex, 14) : dwarfChip(hex, 14), said);
      chips.push(chip);
    }
    const chip = document.createElement('span');
    chip.className = 'k dim';
    const said = document.createElement('i');
    said.textContent = words.kinds?.dim ?? 'Out of circulation';
    chip.append(asNeurons ? neuronChip(NEURAL_COLORS.fact, 16, 'spent') : dwarfChip(hexMix(MEMORY_COLORS.fact, '#0b0f16', 0.52), 14), said);
    chips.push(chip);
    legend.replaceChildren(...chips);
  };
  paintLegend(Boolean(neuralStart));
  const keys = document.createElement('span');
  keys.className = 'nostromo-actions';
  const recenter = document.createElement('button');
  recenter.type = 'button';
  recenter.className = 'mother-close mv-recenter';
  recenter.textContent = words.recenter ?? 'RECENTER';
  recenter.hidden = true;
  // Leaving: the room's close, a sunk track and the cross that turns (styles.css, .x-close), as
  // every window closes; what it does is in its name.
  const backTrack = document.createElement('span');
  backTrack.className = 'surface-modes';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'surface-mode close x-close x-only mv-back';
  back.setAttribute('aria-label', words.back);
  back.title = words.back;
  back.insertAdjacentHTML('beforeend', `<span class="x-icon">${trazo('close')}</span>`); // trusted: our own SVG
  backTrack.append(back);
  // Neural mode (public/neural.js): the same space drawn as neurons, chosen here or in a project.
  const neuralButton = document.createElement('button');
  neuralButton.type = 'button';
  neuralButton.className = 'mother-close neural-key';
  neuralKey(neuralButton);
  keys.append(neuralButton, recenter, backTrack);
  head.append(title, sub, keys);
  const card = document.createElement('aside');
  card.className = 'mv-card';
  card.hidden = true;
  const hint = document.createElement('p');
  hint.className = 'mv-hint';
  // A line of words, or the keys to move round it (public/neural.js, mapKeys).
  if (typeof Node === 'function' && words.hint instanceof Node) hint.append(words.hint); else hint.textContent = words.hint;
  // The kinds of memory and the ways to move sit along the bottom edge (2026-11-10), as in the
  // Memory map: the head keeps only the name, what it holds and its keys.
  const foot = document.createElement('div');
  foot.className = 'nostromo-foot';
  foot.append(legend, hint);
  layer.append(canvas, head, card, foot);
  host.append(layer);

  const view = { w: 0, h: 0, dpr: 1 };
  const camera = { x: 0, y: 0, zoom: 1, to: null, manual: false };
  const textures = { ready: texturesReady() };
  let nebula = null;
  let stars = [];
  let universes = [];
  let hover = null;
  let focus = null;
  let follow = false;       // the camera keeps a chosen universe in the middle while it travels
  let aside = 0;            // how far right of a chosen universe the camera sits, for its card
  let live = null;          // the one universe drawn as the real thing: its scene, its canvas
  let veins = [];           // one per contract between two universes here, with its pulses in flight
  let linking = null;       // a universe being carried onto another, to link them
  let dark = 0;             // how far the space has fallen to black round a chosen universe
  let windows = [];         // the memory windows open over the macroverse, the front one last
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let neural = Boolean(neuralStart);   // drawn as neurons (setNeuralMode)
  let neuralSince = null;               // when it came on, for the light running out from the centre
  let fade = null;                      // the space as it was, fading over the new drawing
  let queued = false;
  let resizeTimer = 0;
  const drag = { active: false, moved: false, turning: false, link: null, x: 0, y: 0, x0: 0, y0: 0 };
  // BISHOP at the centre: its room when the lobby knows it, and its sun (sunOrb), made on first sight;
  // and where the pointer is over the space.
  const core = { centre: true, room: null, screen: null };
  let sun = null;
  let pointer = null;
  // Neural mode, switched from its key or because a project switched it: the space as it was fades
  // over the new drawing, the light runs out from the centre, every universe is drawn again its new
  // way (a sleeping one, painted once, is painted again), and the choice is kept (actions.neural).
  paintNeuralKey(neuralButton, neural);
  function setNeuralMode(on) {
    if (neural === on) return;
    if (!reduced && canvas.width && canvas.height) {
      const held = document.createElement('canvas');
      held.width = canvas.width;
      held.height = canvas.height;
      held.getContext('2d').drawImage(canvas, 0, 0);
      fade = { canvas: held, at: clock };
    }
    neural = on;
    neuralSince = on && !reduced ? clock : null;
    paintNeuralKey(neuralButton, on);
    paintLegend(on);
    layer.querySelector('.neural-invite')?.remove();
    const now = performance.now() / 1000;
    if (core.sprite) core.dirty = true;
    for (const one of universes) {
      if (!one.sprite?.scene) continue;
      if (one.room.open && !reducedMotion()) one.sprite.engine.setNeural(on, now);
      else one.dirty = true;
    }
    live?.engine.setNeural(on, now);
    actions.neural?.(on);
    redraw();
  }
  neuralButton.addEventListener('click', () => setNeuralMode(!neural));
  // When this machine does not give the space its frames, the key invites to try the mode.
  const strain = createStrain({ onStrain: () => { if (!neural) inviteNeural({ key: neuralButton, host: layer, map: 'projects', onTry: () => setNeuralMode(true) }); } });
  // The two drawings, said once (2026-10-28): Home keeps that it was said (salas-mac.js, the tour).
  setTimeout(() => {
    if (!layer.isConnected || !actions.mayTellViews?.()) return;
    if (tellViews({ key: neuralButton, host: layer, neural, onSwitch: () => setNeuralMode(!neural) })) actions.toldViews?.();
  }, 2200);

  function layout(all) {
    // BISHOP's own room is the centre, not a universe on an orbit.
    core.room = bishop ? all.find((room) => room.id === bishop.id) ?? null : null;
    // The Coordinator's own memories round its body (2026-11-07), read and painted as a universe's are:
    // its room is a project like the others. Read again only when what it holds has changed.
    if (core.room) {
      const face = `${core.room.open ? 1 : 0}:${JSON.stringify(core.room.glance?.census ?? null)}`;
      if (core.face !== face || core.dpr !== view.dpr) { core.dirty = true; if (core.face !== face) { core.data = null; core.full = null; core.loading = null; } }
      core.face = face;
      core.dpr = view.dpr;
      core.reach = reachOf(core.room);
    }
    const list = bishop ? all.filter((room) => room.id !== bishop.id) : all;
    const kept = new Map(universes.map((one) => [one.room.id, one]));
    const open = list.filter((room) => room.open);
    const asleep = list.filter((room) => !room.open);
    universes = [...open.map((room, i) => ({ room, orbit: INNER, phase: (i / Math.max(1, open.length)) * Math.PI * 2 + 0.6 })),
      ...asleep.map((room, i) => ({ room, orbit: OUTER, phase: (i / Math.max(1, asleep.length)) * Math.PI * 2 + 1.3 }))]
      .map((placing) => {
        const before = kept.get(placing.room.id);
        // A universe is read and painted again only when what it shows has changed.
        const face = `${placing.room.open ? 1 : 0}:${JSON.stringify(placing.room.glance?.census ?? null)}`;
        const same = before && before.face === face && before.dpr === view.dpr ? before : null;
        return {
          ...placing,
          face,
          dpr: view.dpr,
          reach: reachOf(placing.room),
          data: before && before.face === face ? before.data : null,
          full: before && before.face === face ? before.full : null,
          sprite: same?.sprite ?? null,
          settled: before?.settled ?? null,
          loading: before && before.face === face ? before.loading : null,
          dirty: !same || Boolean(before?.dirty),
        };
      });
    // The veins: one per contract whose two rooms are here, kept across refreshes so a pulse in
    // flight is not lost; a crossing counted since the last look sends a new one.
    const veinsKept = new Map(veins.map((vein) => [vein.enlace.id, vein]));
    const byId = new Map(universes.map((one) => [one.room.id, one]));
    if (core.room) byId.set(core.room.id, core);
    veins = (enlaces ?? []).map((enlace) => {
      const a = byId.get(enlace.rooms?.a), b = byId.get(enlace.rooms?.b);
      if (!a || !b) return null;
      const before = veinsKept.get(enlace.id);
      const vein = { enlace, a, b, seed: (hash(enlace.id) % 628) / 100, pulses: before?.pulses ?? [], lastAt: before ? before.lastAt : enlace.traffic?.lastAt ?? null };
      if (before && enlace.traffic?.lastAt && enlace.traffic.lastAt !== before.lastAt) {
        vein.lastAt = enlace.traffic.lastAt;
        if (vein.pulses.length < VEIN_PULSES) vein.pulses.push({ born: clock, back: enlace.direction === 'b→a' });
      }
      return vein;
    }).filter(Boolean);
    sub.textContent = words.sub(list);
    if (focus) focus = focus.centre ? (core.room ? core : null) : universes.find((one) => one.room.id === focus.room.id) ?? null;
    if (live && (!focus || live.one.room.id !== focus.room.id)) leaveLive();
    if (live && focus) live.one = focus;
    if (focus) drawCard(focus);
  }

  function size() {
    const rect = layer.getBoundingClientRect();
    view.w = rect.width;
    view.h = rect.height;
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    nebula = paintNebula(view.w, view.h, view.dpr, accent);
    stars = [paintStars(11, 260, 0.9, view.dpr), paintStars(23, 90, 1.4, view.dpr), paintStars(37, 30, 2, view.dpr)];
  }

  // What a universe is made of, read from its room through this one. Without `full` no words
  // cross: the far view is drawn from kinds, zones and sizes. The chosen universe asks for them.
  function load(one, full = false) {
    const key = full ? 'full' : 'data';
    if (one[key]) return Promise.resolve(one[key]);
    if (one.loading?.[key]) return one.loading[key];
    const asked = fetch(`/api/salas/universe?id=${encodeURIComponent(one.room.id)}${full ? '&full=1' : ''}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((answer) => {
        const now = one.centre ? (core.room?.id === one.room.id ? core : null) : universes.find((item) => item.room.id === one.room.id);
        if (!now || now.face !== one.face) return null;
        now[key] = answer ?? { unreachable: true };
        if (now.loading) delete now.loading[key];
        if (!full) { now.dirty = true; redraw(); }
        // A saturated machine can miss one read while the room is still alive. Do not keep
        // that transient failure as the universe's permanent texture.
        if (now[key].unreachable || now[key].outdated) setTimeout(() => {
          const current = one.centre ? (core.room?.id === one.room.id ? core : null) : universes.find((item) => item.room.id === one.room.id);
          if (!current || current.face !== one.face || (!current[key]?.unreachable && !current[key]?.outdated)) return;
          current[key] = null;
          if (full) { if (focus === current && !live) enterLive(current); }
          else { current.dirty = true; redraw(); }
        }, 5000);
        return now[key];
      });
    one.loading = { ...(one.loading ?? {}), [key]: asked };
    return asked;
  }

  // One universe is painted a frame, the chosen one first, so a Mac with many rooms never stalls.
  function paintNext() {
    const next = [focus, core.room ? core : null, ...universes].find((one) => one && one.dirty);
    if (!next) return false;
    if (!next.data) { if (!next.loading?.data) void load(next); return false; }
    next.sprite = paintUniverse(next, view.dpr, next.shown ?? null, neural);
    next.dirty = false;
    return true;
  }

  // The slow textures, a band a frame, shared by every scene. Once they are whole, every sprite
  // painted before them is painted again.
  function tick() {
    if (!textures.ready) {
      magmaMap(12);
      if (texturesReady()) {
        textures.ready = true;
        for (const one of [core, ...universes]) if (one.sprite && !one.sprite.ready) one.dirty = true;
      }
    }
    paintNext();
    return !textures.ready || [core.room ? core : null, ...universes].some((one) => one && one.dirty && (one.data || one.loading?.data));
  }

  // Where a universe is now: on its orbit round the Mac, the far side smaller and fainter.
  function placed(one) {
    if (one.centre) return { x: 0, y: 0, scale: 1, light: 1, depth: 1 };
    const angle = one.phase + (reduced ? 0 : clock * TURN);
    const span = Math.min(view.w, view.h * 1.7);
    const depth = (Math.sin(angle) + 1) / 2;   // 0 far, 1 near
    return {
      x: Math.cos(angle) * span * one.orbit,
      y: Math.sin(angle) * span * one.orbit * TILT,
      scale: 0.72 + 0.42 * depth,
      light: 0.36 + 0.64 * depth,
      depth,
    };
  }
  const toScreen = (x, y) => ({ x: view.w / 2 + (x - camera.x) * camera.zoom, y: view.h * 0.54 + (y - camera.y) * camera.zoom });
  const toWorld = (sx, sy) => ({ x: camera.x + (sx - view.w / 2) / camera.zoom, y: camera.y + (sy - view.h * 0.54) / camera.zoom });

  // ---- The live scene: the chosen universe as its room draws it.
  function enterLive(one) {
    if (!one.room.open) return;
    void load(one, true).then((data) => {
      if (!data?.memories || focus !== one || live?.one === one) return;
      const own = canvasOf(LIVE_SIDE * view.dpr, LIVE_SIDE * view.dpr);
      const { scene, engine } = sceneFor(own, LIVE_SIDE, LIVE_SIDE, view.dpr, reduced);
      engine.buildNodes(data);
      // The bodies start where the sprite left them, so the close look continues the far one.
      const far = one.sprite?.scene;
      if (far) {
        const was = new Map(far.nodes.map((node) => [node.memory.id, node]));
        for (const node of scene.nodes) {
          const from = was.get(node.memory.id);
          if (from?.placed) { node.wx = from.wx; node.wy = from.wy; node.wz = from.wz; node.wvx = 0; node.wvy = 0; node.wvz = 0; node.placed = true; }
        }
      }
      engine.placeNostromo();
      scene.words = words;
      scene.neural = neural;
      if (data.sealed) scene.cage = { at: 0, closed: true };
      // The pointer reaches it through its own canvas, which is nowhere on the page: it answers
      // from the origin, and the pointer is moved into its frame before it is asked.
      own.getBoundingClientRect = () => ({ left: 0, top: 0, width: LIVE_SIDE, height: LIVE_SIDE });
      live = { one, canvas: own, scene, engine, last: performance.now(), screen: null };
      if (reduced) { stepLive(performance.now()); redraw(); }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
  }
  function stepLive(now) {
    const { scene, engine } = live;
    const dt = Math.min(48, now - live.last) / 16;
    live.last = now;
    const t = now / 1000;
    if (!reduced && !scene.selected && !drag.turning) scene.yaw += dt * LIVE_TURN;
    engine.stepNostromo(dt, t);
    engine.focusNostromo(dt, t);
    engine.projectNostromo();
    engine.fitNostromo();
    engine.drawNostromo(t);
  }
  // Leaving keeps where the bodies settled, so the sprite painted next continues the live one.
  function leaveLive() {
    if (!live) return;
    live.one.settled = new Map(live.scene.nodes.map((node) => [node.memory.id, { wx: node.wx, wy: node.wy, wz: node.wz, wvx: 0, wvy: 0, wvz: 0 }]));
    live.one.dirty = true;
    live = null;
    closeMemories();
  }

  // ---- The far universes, alive. Each one that is awake and on screen is drawn again at most
  // FAR_FPS times a second, the least recently drawn first, until the frame's few milliseconds
  // are spent: with many rooms each one simply moves a little less often, and nothing stalls.
  function animateFar(now) {
    const started = performance.now();
    const due = universes
      .filter((one) => one.room.open && one.sprite?.engine && one.onScreen && live?.one !== one && now - (one.drawnAt ?? 0) >= 1000 / FAR_FPS)
      .sort((a, b) => (a.drawnAt ?? 0) - (b.drawnAt ?? 0));
    for (const one of due) {
      if (performance.now() - started > FAR_BUDGET) break;
      const sprite = one.sprite;
      if (one.shown && Math.abs(Math.log(Math.max(SIDE_MIN, one.shown) / sprite.css)) > Math.log(SIDE_STEP)) resizeUniverse(sprite, one.shown, view.dpr);
      const { scene, engine } = sprite;
      const dt = Math.min(48, now - (one.drawnAt || now - 16)) / 16;
      one.drawnAt = now;
      scene.yaw = (scene.yaw ?? 0) + dt * FAR_TURN;
      engine.stepNostromo(dt, now / 1000);
      engine.projectNostromo();
      engine.drawNostromo(now / 1000);
    }
  }
  // The pointer, in the live scene's own frame: what it is over there, or null when it is outside.
  function liveAt(event) {
    if (!live?.screen) return null;
    const rect = canvas.getBoundingClientRect();
    const k = LIVE_SIDE / live.screen.side;
    const lx = (event.clientX - rect.left - live.screen.x) * k;
    const ly = (event.clientY - rect.top - live.screen.y) * k;
    if (lx < 0 || ly < 0 || lx > LIVE_SIDE || ly > LIVE_SIDE) return { inside: false, at: null };
    return { inside: true, at: live.engine.nostromoAt({ clientX: lx, clientY: ly }) };
  }

  function frame(now) {
    const started = performance.now();
    advance(now);
    strain.frame(performance.now() - started, now);
    raf = reduced && !camera.to ? 0 : requestAnimationFrame(frame);
  }
  // One frame's worth of everything, without asking for the next: what frame() does, and what
  // whoever measures the macroverse (`__macroverso.step`) runs when the screen gives no frames.
  function advance(now) {
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    clock += dt;
    tick();
    if (camera.to) {
      // Never below 0: a frame stamped before the flight began (a tab coming back, a measured
      // step) made k hugely negative, the cubic ease threw the zoom to -4.5e8 and the orbits could
      // not be drawn (1.1.0 diagnostics).
      const k = Math.max(0, Math.min(1, (now - camera.to.at) / camera.to.ms));
      const e = ease(k);
      camera.x = camera.to.from.x + (camera.to.x - camera.to.from.x) * e;
      camera.y = camera.to.from.y + (camera.to.y - camera.to.from.y) * e;
      camera.zoom = camera.to.from.zoom + (camera.to.zoom - camera.to.from.zoom) * e;
      if (k >= 1) camera.to = null;
    } else if (focus && follow && !camera.manual) {
      // A chosen universe keeps the middle while it travels.
      const at = placed(focus);
      camera.x = at.x + aside;
      camera.y = at.y;
    }
    // The space falls to black round a chosen universe, and comes back when it is let go.
    const want = focus && !focus.centre ? FOCUS_DARK : 0;   // BISHOP chosen: its card, not the dark
    dark = reduced ? want : dark + (want - dark) * Math.min(1, dt * 3.5);
    if (live) stepLive(now);
    if (!reduced) {
      animateFar(now);
      // A vein is alive while its contract is: a pulse every couple of seconds even when no
      // crossing was counted, more of them the more it is read.
      for (const vein of veins) {
        const busy = 1 + 2 * Math.min(1, (vein.enlace.traffic?.reads1h ?? 0) / 6);
        if (vein.pulses.length < VEIN_PULSES && Math.random() < dt * VEIN_AMBIENT * busy) {
          vein.pulses.push({ born: clock, back: vein.enlace.direction === 'b→a' || (vein.enlace.direction === 'both' && Math.random() < 0.5) });
        }
      }
    }
    draw();
  }
  // One frame when something changed, for a still macroverse; and the next while there is still a
  // sprite to paint or a texture to finish.
  function redraw() {
    if (raf || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; const more = tick(); draw(); if (more) redraw(); });
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const beat = reduced ? 0.4 : 0.5 + 0.5 * Math.sin(clock * 5.46);
    // Neural mode: no nebula and no stars, the dark the neurons stand on.
    if (neural) neuralGround(ctx, view.w, view.h, beat);
    else if (nebula) ctx.drawImage(nebula, 0, 0, view.w, view.h);
    // Stars: the near ones move with the camera, the far ones barely. The tiles repeat under any
    // movement, so the space has no edge.
    if (!neural) stars.forEach((tile, depth) => {
      const speed = [0.04, 0.1, 0.22][depth] * camera.zoom;
      const ox = (((-camera.x * speed - clock * (reduced ? 0 : 1.5 * (depth + 1))) % tile.side) + tile.side) % tile.side;
      const oy = (((-camera.y * speed) % tile.side) + tile.side) % tile.side;
      for (let x = ox - tile.side; x < view.w; x += tile.side) {
        for (let y = oy - tile.side; y < view.h; y += tile.side) ctx.drawImage(tile.canvas, x, y, tile.side, tile.side);
      }
    });

    // The orbits, faint, round BISHOP at the centre.
    const centre = toScreen(0, 0);
    const span = Math.min(view.w, view.h * 1.7);
    ctx.lineWidth = 1;
    for (const orbit of [INNER, OUTER]) {
      ctx.strokeStyle = neural ? `rgba(${NEURAL_AXON}, .1)` : 'rgba(242, 241, 238, .11)';
      ctx.setLineDash(orbit === OUTER ? [3, 7] : []);
      ctx.beginPath();
      ctx.ellipse(centre.x, centre.y, span * orbit * camera.zoom, span * orbit * TILT * camera.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    drawVeins(ctx);
    drawCentre(ctx, beat);

    // The universes, far ones first.
    const order = universes.map((one) => ({ one, at: placed(one) })).sort((a, b) => a.at.depth - b.at.depth);
    // The chosen universe stands in front of the dark; everything else falls behind it.
    const lifted = live?.one ?? focus;
    for (const { one, at } of order) if (one !== lifted) drawUniverse(ctx, one, at, beat);
    // The space falls to black round a chosen universe — all of it, edge to edge, never a square
    // round the universe — and further while one of its memories is held (the live scene darkens
    // its own bodies by the same amount, so the two meet without a seam).
    const held = live?.scene.lock?.fade ?? 0;
    const veil = 1 - (1 - dark) * (1 - FOCUS_VEIL * held);
    if (veil > 0.004) { ctx.fillStyle = `rgba(2, 1, 4, ${veil})`; ctx.fillRect(0, 0, view.w, view.h); }
    const top = order.find((entry) => entry.one === lifted);
    if (top) drawUniverse(ctx, top.one, top.at, beat);
    // Changing the drawing: the space as it was fades over the new one.
    if (fade) {
      const k = (clock - fade.at) / NEURAL_CROSSFADE;
      if (k >= 1 || k < 0) fade = null;
      else { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - k * (2 - k); ctx.drawImage(fade.canvas, 0, 0); ctx.restore(); }
    }
  }

  // One universe on screen: MOTHER's warmth, the live scene or its own living canvas, its rings
  // and its name.
  function drawUniverse(ctx, one, at, beat) {
    const p = toScreen(at.x, at.y);
    const glance = one.room.glance ?? {};
    const awake = Boolean(one.room.open);
    const isLive = live?.one === one;
    // On screen: the live scene at its own size, or the sprite at the universe's.
    const breath = glance.working?.length && !reduced && !isLive ? 1 + 0.035 * Math.sin(clock * 3.2) : 1;
    const side = isLive ? LIVE_SIDE * (camera.zoom / FOCUS_ZOOM) : one.reach * 2 * at.scale * camera.zoom * breath;
    const r = isLive ? side * 0.19 : one.reach * at.scale * camera.zoom * 0.2;   // MOTHER's radius on screen, for the rings and the names
    one.screen = { x: p.x, y: p.y, r: side / 2 };
    one.shown = side;
    one.onScreen = !(p.x < -side || p.x > view.w + side || p.y < -side || p.y > view.h + side);
    if (!one.onScreen) { if (isLive) live.screen = null; return; }
    // MOTHER's warmth on the dark, breathing with her heart; a sleeping room gives off a cold glow.
    ctx.globalCompositeOperation = 'lighter';
    // Far (the back of an orbit, or the camera drawn back) it is smaller and dimmer: the near ones lead.
    const away = at.light * at.light * (0.55 + 0.45 * Math.min(1, camera.zoom));
    const reach = r * (2.3 + 0.2 * beat);
    const halo = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, reach);
    halo.addColorStop(0, neural ? (awake ? `rgba(${NEURAL_AXON}, ${(0.12 + 0.04 * beat) * away})` : `rgba(120, 150, 200, ${0.05 * away})`) : awake ? `rgba(226, 40, 22, ${(0.16 + 0.05 * beat) * away})` : `rgba(120, 150, 200, ${0.08 * away})`);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(p.x, p.y, reach, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = at.light * (hover && hover !== one && !focus ? 0.7 : 1) * (awake ? 1 : 0.6);
    if (isLive) {
      live.screen = { x: p.x - side / 2, y: p.y - side / 2, side };
      ctx.drawImage(live.canvas, p.x - side / 2, p.y - side / 2, side, side);
    } else if (one.sprite) {
      ctx.drawImage(one.sprite.canvas, p.x - side / 2, p.y - side / 2, side, side);
    } else {
      // Not read yet: an ember where it will be.
      const ember = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      ember.addColorStop(0, neural ? (awake ? '#9fdcff' : '#56637a') : awake ? '#ff7a3a' : '#56637a');
      ember.addColorStop(1, neural ? 'rgba(20, 60, 110, 0)' : awake ? 'rgba(168, 23, 12, 0)' : 'rgba(27, 33, 48, 0)');
      ctx.fillStyle = ember;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Waiting for you: a ring in the accent, breathing.
    if (glance.waitingCount) {
      const pulse = reduced ? 0.6 : 0.45 + 0.35 * Math.sin(clock * 2.4);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, side * 0.56, side * 0.56 * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if ((one === hover && !isLive) || one.room.id === here) {
      ctx.strokeStyle = one === focus ? '#ffffff' : 'rgba(255, 255, 255, .55)';
      ctx.lineWidth = one === focus ? 1.6 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, side * 0.52, 0, Math.PI * 2); ctx.stroke();
    }
    // Its name, under it.
    const below = p.y + side * 0.5 + 8;
    ctx.font = `600 ${Math.round(13 + 3 * at.depth)}px Geist, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Over a galaxy a name needs its own dark edge to be read.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(3, 3, 5, .75)';
    ctx.lineWidth = 4;
    ctx.fillStyle = awake ? 'rgba(242, 241, 238, .95)' : 'rgba(200, 210, 225, .6)';
    // A name keeps more of its light than its body: far, it is dimmer, never unreadable.
    ctx.globalAlpha = 0.62 + 0.38 * at.depth;
    ctx.strokeText(one.room.name, p.x, below);
    ctx.fillText(one.room.name, p.x, below);
    ctx.font = '500 11px Geist, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.lineWidth = 3;
    ctx.fillStyle = glance.waitingCount ? accent : 'rgba(242, 241, 238, .6)';
    ctx.strokeText(words.state(one.room), p.x, below + 19);
    ctx.fillText(words.state(one.room), p.x, below + 19);
    ctx.globalAlpha = 1;
  }

  // BISHOP at the centre: a sun in the planets view (sunOrb, 2026-11-10; it was a nebula with an eye),
  // the bulb of the brain in the neural one. Dimmer while its room sleeps. Its name and its state
  // under it.
  function drawCentre(ctx, beat) {
    if (!bishop) return;
    const room = core.room;
    const awake = Boolean(room?.open);
    const float = reduced ? 0 : Math.sin(clock * 0.8) * 3;
    const centre = toScreen(0, 0);
    const p = { x: centre.x, y: centre.y + float * Math.max(0.6, camera.zoom) };
    const r = 30 * clamp(camera.zoom, 0.75, 1.8);
    core.screen = { x: p.x, y: p.y, r: r * (neural ? 1.8 : 1.3) };
    // Its memories first, round where its body floats: the same sprite a project's universe wears.
    if (core.sprite && core.reach) {
      // Wide enough that its memories sit round its body and are not hidden under it.
      const side = Math.max(core.reach * 2 * camera.zoom, r * 12);
      core.shown = side;
      ctx.globalAlpha = awake ? 1 : 0.6;
      ctx.drawImage(core.sprite.canvas, p.x - side / 2, p.y - side / 2, side, side);
      ctx.globalAlpha = 1;
    }
    // Neural mode: the centre of the brain, its bulb, in the Coordinator's violet; no eye, no gas.
    if (neural) {
      const ignite = neuralSince === null ? 1 : clamp((clock - neuralSince) / NEURAL_IGNITION, 0, 1);
      drawNeuralBulb(ctx, p.x, p.y, r * 1.6, clock, { beat, light: awake ? 1 : 0.6, ignite, tone: 'bishop', still: reduced });
    } else {
      // The planets view: a sun (sunOrb). It turns slowly; asleep, it burns lower.
      if (!sun) sun = sunOrb();
      const life = awake ? 1 : 0.62;
      if (clock - sun.paintedAt >= 1 / ORB_FPS || sun.paintedAt < 0) {
        sun.paint(reduced ? 0 : clock * 0.035, life);
        sun.paintedAt = clock;
      }
      drawSun(ctx, p.x, p.y, r, sun, { life, beat });
    }
    // A ring in the accent while a universe is carried onto it, and while it waits for the person;
    // a white one while it is pointed at or chosen.
    const target2 = linking?.over === core;
    if (target2 || room?.glance?.waitingCount) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = target2 ? 0.95 : reduced ? 0.6 : 0.45 + 0.35 * Math.sin(clock * 2.4);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * (neural ? 2.2 : 1.5), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (core === hover || core === focus) {
      ctx.strokeStyle = core === focus ? 'rgba(255, 255, 255, .85)' : 'rgba(255, 255, 255, .4)';
      ctx.lineWidth = core === focus ? 1.4 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * (neural ? 2.2 : 1.5), 0, Math.PI * 2); ctx.stroke();
    }
    // The bulb's stem reaches lower than the sun: its name stands under the stem.
    const below = p.y + r * (neural ? 3.25 : 1.62) + 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(3, 3, 5, .75)';
    ctx.font = '650 15px Geist, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(242, 241, 238, .95)';
    ctx.strokeText(words.bishop ?? 'Coordinator', p.x, below);
    ctx.fillText(words.bishop ?? 'Coordinator', p.x, below);
    ctx.font = '500 11px Geist, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.lineWidth = 3;
    ctx.fillStyle = room?.glance?.waitingCount ? accent : 'rgba(242, 241, 238, .6)';
    const said = room ? words.state(room) : (words.asleep ?? '');
    ctx.strokeText(said, p.x, below + 19);
    ctx.fillText(said, p.x, below + 19);
  }

  // The veins between universes: one per contract, drawn as NOSTROMO draws the vein between two
  // memories — a wide breath of colour and a thin bright thread — with the current running from
  // the room that serves to the one that reads, and a pulse for every crossing counted since the
  // last look. And, while a universe is being carried onto another, the vein it would make.
  function drawVeins(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    for (const vein of veins) {
      const { enlace } = vein;
      const wa = placed(vein.a), wb = placed(vein.b);
      const pa = toScreen(wa.x, wa.y), pb = toScreen(wb.x, wb.y);
      const dx = pb.x - pa.x, dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const bow = Math.sin((reduced ? 0 : clock * 0.5) + vein.seed) * Math.min(70, d * 0.16);
      const cx = (pa.x + pb.x) / 2 - (dy / d) * bow;
      const cy = (pa.y + pb.y) / 2 + (dx / d) * bow;
      const traffic = enlace.traffic ?? {};
      const recent = Math.min(1, (traffic.reads1h ?? 0) / 6);
      const lately = Math.min(1, (traffic.reads24h ?? 0) / 12);
      const back = enlace.direction === 'b→a';
      const from = back ? pb : pa, to = back ? pa : pb;
      // MOTHER's red leaves the room that serves and the accent arrives where it is read; both
      // ways, red at both ends with the accent between them.
      // Neural mode: an axon between two clusters, in one cold line, and what crosses it a light
      // with the stretch it has just run lit behind it.
      if (neural) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(${NEURAL_AXON}, ${0.18 + 0.22 * lately})`;
        ctx.lineWidth = 0.9 + 0.6 * lately;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(cx, cy, pb.x, pb.y); ctx.stroke();
        vein.pulses = vein.pulses.filter((pulse) => clock - pulse.born < VEIN_LIFE);
        for (const pulse of vein.pulses) {
          const u = Math.min(1, (clock - pulse.born) / VEIN_LIFE);
          const along = (k) => alongCurve(pa.x, pa.y, cx, cy, pb.x, pb.y, pulse.back ? 1 - k : k);
          let behind = along(u);
          const head = behind;
          for (let step = 1; step <= 6; step += 1) {
            const back = along(Math.max(0, u - step * 0.03));
            ctx.strokeStyle = hexAlpha(accent, 0.5 - step * 0.07);
            ctx.lineWidth = 2 - step * 0.22;
            ctx.beginPath(); ctx.moveTo(behind.x, behind.y); ctx.lineTo(back.x, back.y); ctx.stroke();
            behind = back;
          }
          const size = (6 + 4 * Math.sin(u * Math.PI)) * Math.max(0.7, Math.min(1.4, camera.zoom));
          ctx.drawImage(neuronGlow(accent), head.x - size, head.y - size, size * 2, size * 2);
        }
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      const red = '#e22816';
      const arriving = enlace.direction === 'both' ? red : accent;
      const head = reduced ? 0.5 : ((clock * (0.06 + 0.2 * recent) + vein.seed) % 1 + 1) % 1;
      ctx.strokeStyle = currentAlong(ctx, from.x, from.y, to.x, to.y, hexAlpha(red, 0.5 + 0.3 * lately), { mid: hexAlpha(hexMix(red, accent, 0.5), 0.35 + 0.25 * lately), end: hexAlpha(arriving, 0.5 + 0.3 * lately) }, head, 0.2 + 0.7 * recent);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
      ctx.globalAlpha = 0.32; ctx.lineWidth = 5 + 3 * lately; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1 + 0.8 * lately; ctx.stroke();
      // The pulses: one per crossing counted, travelling the way the notes did.
      vein.pulses = vein.pulses.filter((pulse) => clock - pulse.born < VEIN_LIFE);
      for (const pulse of vein.pulses) {
        const u = Math.min(1, (clock - pulse.born) / VEIN_LIFE);
        const at = alongCurve(pa.x, pa.y, cx, cy, pb.x, pb.y, pulse.back ? 1 - u : u);
        const size = (1.3 + 1 * Math.sin(u * Math.PI)) * Math.max(0.6, Math.min(1.4, camera.zoom));
        const halo = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, size * 3);
        halo.addColorStop(0, hexAlpha(accent, 0.6));
        halo.addColorStop(1, hexAlpha(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(at.x, at.y, size * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 248, 243, .95)';
        ctx.beginPath(); ctx.arc(at.x, at.y, size, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (linking?.from?.screen) {
      const from = linking.from.screen;
      const over = linking.over?.screen;
      const to = over ? { x: over.x, y: over.y } : { x: linking.x, y: linking.y };
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = hexAlpha(accent, over ? 0.9 : 0.55);
      ctx.lineWidth = over ? 2 : 1.4;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - 40, to.x, to.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function at(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let best = null;
    for (const one of core.room ? [core, ...universes] : universes) {
      if (!one.screen) continue;
      const d = Math.hypot(one.screen.x - x, one.screen.y - y);
      if (d <= Math.max(26, one.screen.r * 1.1) && (!best || d < best.d)) best = { one, d };
    }
    return best?.one ?? null;
  }

  function fly(to, ms = 900) {
    camera.to = { from: { x: camera.x, y: camera.y, zoom: camera.zoom }, ...to, at: performance.now(), ms: reduced ? 1 : ms };
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function home() {
    camera.manual = false;
    recenter.hidden = true;
    if (focus) { follow = true; const where = placed(focus); fly({ x: where.x + aside, y: where.y, zoom: focus.centre ? 1.4 : FOCUS_ZOOM }); }
    else fly({ x: 0, y: 0, zoom: 1 });
  }

  // ---- Memory windows. A memory picked inside the chosen universe opens in a window of its own,
  // as NOSTROMO's cards do: moved by its header, brought forward by a touch, closed with its ×,
  // several at once (MEMORY_WINDOWS; the oldest gives way). The one in front is the memory the
  // live scene holds in its sight.
  const shelf = document.createElement('div');
  shelf.className = 'mv-windows';
  layer.append(shelf);
  function raiseMemory(win) {
    windows = [...windows.filter((one) => one !== win), win];
    windows.forEach((one, index) => { one.el.style.zIndex = String(10 + index); one.el.classList.toggle('front', one === win); });
    if (live) { live.scene.selected = win.node; if (reduced) { stepLive(performance.now()); redraw(); } }
  }
  function closeMemory(win) {
    windows = windows.filter((one) => one !== win);
    win.el.remove();
    const front = windows.at(-1);
    if (front) raiseMemory(front);
    else if (live) { live.scene.selected = null; if (reduced) { stepLive(performance.now()); redraw(); } }
  }
  function closeMemories() {
    for (const win of windows) win.el.remove();
    windows = [];
  }
  function openMemory(node) {
    const already = windows.find((win) => win.node.memory.id === node.memory.id);
    if (already) { raiseMemory(already); return; }
    while (windows.length >= MEMORY_WINDOWS) closeMemory(windows[0]);
    const memory = node.memory;
    const el = document.createElement('aside');
    el.className = 'mv-mem';
    el.style.setProperty('--k', node.color);
    const step = windows.length;
    // Each one a step right and down of the last, far enough that every header stays in reach.
    el.style.left = `${40 + step * 44}px`;
    el.style.top = `${150 + step * 56}px`;
    const head = document.createElement('header');
    const kind = document.createElement('b');
    kind.textContent = words.kind(memory.kind);
    // The room's close: a sunk track and the cross that turns (styles.css, .x-close).
    const track = document.createElement('span');
    track.className = 'surface-modes';
    const shut = document.createElement('button');
    shut.type = 'button';
    shut.className = 'surface-mode close x-close x-only';
    shut.setAttribute('aria-label', words.close ?? 'Close');
    const cross = document.createElement('span');
    cross.className = 'x-icon';
    cross.innerHTML = trazo('close');
    shut.append(cross);
    track.append(shut);
    head.append(kind, track);
    const text = document.createElement('p');
    text.className = 'mv-mem-text';
    text.textContent = memory.text ?? '';
    const meta = document.createElement('p');
    meta.className = 'mv-mem-meta';
    const span = memory.fromSequence ? (memory.fromSequence === memory.throughSequence ? `#${memory.fromSequence}` : `#${memory.fromSequence}–#${memory.throughSequence}`) : null;
    meta.textContent = [span, memory.agent ? `@${memory.agent}` : null, memory.created ? new Date(memory.created).toLocaleString() : null].filter(Boolean).join(' · ');
    el.append(head, text);
    if (meta.textContent) el.append(meta);
    shelf.append(el);
    const win = { node, el };
    windows.push(win);
    shut.addEventListener('click', (event) => { event.stopPropagation(); closeMemory(win); });
    el.addEventListener('pointerdown', () => { if (windows.at(-1) !== win) raiseMemory(win); });
    // Moved by its header, inside the macroverse.
    head.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      const room = layer.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const dx = event.clientX - box.left, dy = event.clientY - box.top;
      el.classList.add('moving');
      try { head.setPointerCapture(event.pointerId); } catch { /* the pointer already left */ }
      const move = (moving) => {
        el.style.left = `${clamp(moving.clientX - room.left - dx, 0, room.width - 80)}px`;
        el.style.top = `${clamp(moving.clientY - room.top - dy, 0, room.height - 48)}px`;
      };
      const drop = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', drop); head.removeEventListener('pointercancel', drop); el.classList.remove('moving'); };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', drop);
      head.addEventListener('pointercancel', drop);
    });
    raiseMemory(win);
  }

  function drawCard(one) {
    if (one.centre) { drawCentreCard(); return; }
    const room = one.room;
    const glance = room.glance ?? {};
    const census = glance.census;
    card.replaceChildren();
    const name = document.createElement('h3');
    name.textContent = room.name;
    const state = document.createElement('p');
    state.className = 'mv-state';
    state.textContent = words.state(room);
    card.append(name, state);
    if (room.root) { const path = document.createElement('p'); path.className = 'mv-path'; path.textContent = words.path(room.root); card.append(path); }
    if (glance.waiting?.length) { const wait = document.createElement('p'); wait.className = 'mv-wait'; wait.textContent = words.ask(glance.waiting[0]); card.append(wait); }
    if (census?.memories) {
      const list = document.createElement('ul');
      list.className = 'mv-kinds';
      for (const kind of KINDS) {
        const n = census.kinds?.[kind] ?? 0;
        if (!n) continue;
        const row = document.createElement('li');
        row.style.setProperty('--k', MEMORY_COLORS[kind]);
        const bar = document.createElement('i');
        bar.style.width = `${Math.max(3, (n / census.memories) * 100)}%`;
        const label = document.createElement('span');
        label.textContent = `${words.kind(kind)} · ${n}`;
        row.append(label, bar);
        list.append(row);
      }
      card.append(list);
    }
    const counts = document.createElement('p');
    counts.className = 'mv-counts';
    const veins = one.data?.links?.length ?? one.full?.links?.length ?? null;
    counts.textContent = [words.counts(room), veins !== null && words.veins ? words.veins(veins) : null].filter(Boolean).join(' · ');
    card.append(counts);
    // Its links, as seen from here: who reads whom, and what crosses.
    const mine = (enlaces ?? []).filter((enlace) => enlace.rooms?.a === room.id || enlace.rooms?.b === room.id);
    if (mine.length) {
      const links = document.createElement('ul');
      links.className = 'mv-links';
      for (const enlace of mine) {
        const row = document.createElement('li');
        row.textContent = words.linkRow?.(enlace, room.id) ?? enlace.id;
        links.append(row);
      }
      card.append(links);
    }
    const row = document.createElement('div');
    row.className = 'mv-actions';
    if (room.open) {
      const go = document.createElement('a');
      go.className = 'sm-btn primary';
      go.textContent = room.id === here ? words.backToRoom : words.enter;
      go.href = room.id === here ? '/' : `http://127.0.0.1:${room.open.port}/`;
      row.append(go);
    } else if (room.root) {
      const wake = document.createElement('button');
      wake.type = 'button';
      wake.className = 'sm-btn primary';
      wake.textContent = words.wake;
      wake.addEventListener('click', async () => { wake.disabled = true; wake.textContent = words.waking; await actions.wake(room); });
      row.append(wake);
    }
    if (actions.link && words.link) {
      // From the card, this room as the one that would read: the sheet asks the rest.
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'sm-btn ghost';
      link.textContent = words.link;
      link.addEventListener('click', () => actions.link(null, room));
      row.append(link);
    }
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'sm-btn ghost';
    out.textContent = words.all;
    out.addEventListener('click', () => choose(null));
    row.append(out);
    card.append(row);
    card.hidden = false;
  }

  // BISHOP's card: its state, the rooms it reads (a vein each) and the ones it does not yet, each a
  // key that asks for the link; the way into its room.
  function drawCentreCard() {
    const room = core.room;
    card.replaceChildren();
    const name = document.createElement('h3');
    name.textContent = words.bishop ?? 'Coordinator';
    const state = document.createElement('p');
    state.className = 'mv-state';
    state.textContent = room ? words.state(room) : (words.asleep ?? '');
    card.append(name, state);
    if (words.bishopAbout) { const about = document.createElement('p'); about.className = 'mv-about'; about.textContent = words.bishopAbout; card.append(about); }
    if (room?.glance?.waiting?.length) { const wait = document.createElement('p'); wait.className = 'mv-wait'; wait.textContent = words.ask(room.glance.waiting[0]); card.append(wait); }
    const mine = (enlaces ?? []).filter((enlace) => enlace.rooms?.a === bishop.id || enlace.rooms?.b === bishop.id);
    const reads = document.createElement('p');
    reads.className = 'mv-counts';
    reads.textContent = words.bishopReads?.(mine.length) ?? '';
    card.append(reads);
    if (mine.length) {
      const links = document.createElement('ul');
      links.className = 'mv-links';
      for (const enlace of mine) {
        const row = document.createElement('li');
        row.textContent = words.linkRow?.(enlace, bishop.id) ?? enlace.id;
        links.append(row);
      }
      card.append(links);
    }
    // The rooms it does not read yet: a key each, that opens the sheet with BISHOP as the reader.
    const linked = new Set(mine.flatMap((enlace) => [enlace.rooms?.a, enlace.rooms?.b]));
    const unlinked = universes.filter((one) => !linked.has(one.room.id));
    if (unlinked.length && actions.link && room) {
      const label = document.createElement('p');
      label.className = 'mv-counts';
      label.textContent = words.notLinked ?? '';
      const keys = document.createElement('div');
      keys.className = 'mv-actions mv-unlinked';
      for (const one of unlinked.slice(0, 8)) {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'sm-btn small';
        key.textContent = one.room.name;
        key.addEventListener('click', () => actions.link(one.room, room));
        keys.append(key);
      }
      card.append(label, keys);
    }
    const row = document.createElement('div');
    row.className = 'mv-actions';
    if (room?.open) {
      const go = document.createElement('a');
      go.className = 'sm-btn primary';
      go.textContent = words.talk ?? words.enter;
      go.href = room.id === here ? '/' : `http://127.0.0.1:${room.open.port}/`;
      row.append(go);
    } else if (room) {
      const wake = document.createElement('button');
      wake.type = 'button';
      wake.className = 'sm-btn primary';
      wake.textContent = words.wake;
      wake.addEventListener('click', async () => { wake.disabled = true; wake.textContent = words.waking; await actions.wake(room); });
      row.append(wake);
    }
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'sm-btn';
    out.textContent = words.all;
    out.addEventListener('click', () => choose(null));
    row.append(out);
    card.append(row);
    card.hidden = false;
  }

  function choose(one) {
    if (focus && focus !== one) leaveLive();
    focus = one;
    camera.manual = false;
    recenter.hidden = true;
    if (!one) {
      card.hidden = true;
      follow = false;
      fly({ x: 0, y: 0, zoom: 1 });
      return;
    }
    drawCard(one);
    // BISHOP is not a universe to enter: the camera comes a little closer and its card opens.
    const zoom = one.centre ? 1.4 : FOCUS_ZOOM;
    aside = (view.w * 0.16) / zoom;
    follow = true;
    const where = placed(one);
    fly({ x: where.x + aside, y: where.y, zoom });
    if (!one.centre) enterLive(one);
  }

  // Pointer: a drag on the space moves it; a drag on the chosen universe turns it; a click picks a
  // universe, or a memory inside the chosen one; the wheel brings the space closer round the pointer.
  const covered = (event) => {
    const panels = [...windows.map((win) => win.el), card, ...document.querySelectorAll('dialog[open], .tree.window, .surface.window, .conv-window, .browser-dock.window')];
    return panels.some((panel) => {
      if (panel.hidden || panel.contains(canvas)) return false;
      const rect = panel.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || covered(event)) return;
    drag.active = true;
    drag.moved = false;
    drag.turning = Boolean(liveAt(event)?.inside);
    // A universe under the pointer may be carried onto another, to link them.
    drag.link = drag.turning ? null : at(event);
    drag.x = drag.x0 = event.clientX;
    drag.y = drag.y0 = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* the pointer already left */ }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (covered(event)) return;
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (drag.active) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (drag.link && !drag.turning) {
        // A universe carried onto another: the vein it would make, until the pointer lets go.
        if (!linking && Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0) < LINK_DRAG) return;
        const rect = canvas.getBoundingClientRect();
        const over = at(event);
        linking = { from: drag.link, x: event.clientX - rect.left, y: event.clientY - rect.top, over: over && over !== drag.link ? over : null };
        canvas.style.cursor = linking.over ? 'copy' : 'grabbing';
        redraw();
        return;
      }
      if (drag.turning && live) {
        if (live.scene.lock) live.scene.lock.aim = false;
        live.scene.yaw = (live.scene.yaw ?? 0) + dx * TURN_PER_PIXEL;
        live.scene.pitch = clamp((live.scene.pitch ?? 0) + dy * TURN_PER_PIXEL, -PITCH_LIMIT, PITCH_LIMIT);
        if (reduced) { stepLive(performance.now()); redraw(); }
      } else {
        camera.to = null;
        camera.x -= dx / camera.zoom;
        camera.y -= dy / camera.zoom;
        camera.manual = true;
        recenter.hidden = false;
        redraw();
      }
      canvas.style.cursor = 'grabbing';
      return;
    }
    const now = at(event);
    const over = liveAt(event);
    const node = over?.at && over.at !== 'core' ? over.at : null;
    if (live && live.scene.hover !== node) { live.scene.hover = node; if (reduced) { stepLive(performance.now()); redraw(); } }
    if (now !== hover) { hover = now; redraw(); }
    canvas.style.cursor = node || over?.at === 'core' ? 'pointer' : now && now !== focus ? 'pointer' : over?.inside ? 'grab' : 'default';
  });
  const release = (event) => {
    // Let go over another universe: the notes of the one carried would travel to it.
    if (linking?.over && event?.type === 'pointerup' && !covered(event)) actions.link?.(linking.from.room, linking.over.room);
    linking = null;
    drag.active = false;
    drag.turning = false;
    drag.link = null;
    canvas.style.cursor = 'default';
    redraw();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hover = null; pointer = null; if (live) live.scene.hover = null; redraw(); });
  canvas.addEventListener('click', (event) => {
    if (covered(event)) return;
    if (drag.moved) { drag.moved = false; return; }
    const over = liveAt(event);
    if (over?.inside && live) {
      // Inside the chosen universe: a memory is picked and read on the card; the dark lets go of it on the next click.
      // A memory opens in its own window; the dark lets go of the one in the sight, and the
      // windows stay open until they are closed.
      const node = over.at && over.at !== 'core' ? over.at : null;
      if (node) openMemory(node);
      else { live.scene.selected = null; for (const win of windows) win.el.classList.remove('front'); }
      if (reduced) { stepLive(performance.now()); redraw(); }
      if (node || over.at === 'core') return;
    }
    const one = at(event);
    choose(one && one !== focus ? one : focus && !one ? null : one);
  });
  canvas.addEventListener('wheel', (event) => {
    if (covered(event)) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    const before = toWorld(px, py);
    camera.to = null;
    camera.zoom = clamp(camera.zoom * Math.exp(-event.deltaY * 0.0012), ZOOM_MIN, ZOOM_MAX);
    const after = toWorld(px, py);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
    camera.manual = true;
    recenter.hidden = false;
    redraw();
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const list = universes;
      if (!list.length) return;
      const i = focus ? list.indexOf(focus) : -1;
      choose(list[(i + (event.key === 'ArrowRight' ? 1 : list.length - 1) + (i < 0 ? 1 : 0)) % list.length]);
    }
  });
  function onKey(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (windows.length) closeMemory(windows.at(-1));
    else if (live?.scene.selected) { live.scene.selected = null; if (reduced) { stepLive(performance.now()); redraw(); } }
    else if (focus) choose(null);
    else close();
  }
  document.addEventListener('keydown', onKey);
  recenter.addEventListener('click', home);
  // A window being resized is settled before anything is painted again: the sky and the stars at
  // the new size, the sprites only if the density changed.
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { size(); layout(rooms); redraw(); }, 150); };
  window.addEventListener('resize', onResize);
  // As a window (salas-mac.js, homeWindow) it is sized by its own sides, not the browser's.
  const sized = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (view.w && Math.abs(layer.getBoundingClientRect().width - view.w) + Math.abs(layer.getBoundingClientRect().height - view.h) > 1) onResize(); }) : null;
  sized?.observe(layer);
  const onVisible = () => { if (!document.hidden && !raf && !reduced) { last = performance.now(); if (live) live.last = last; raf = requestAnimationFrame(frame); } else if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVisible);

  function close() {
    cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(resizeTimer);
    live = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    sized?.disconnect();
    document.removeEventListener('visibilitychange', onVisible);
    layer.classList.add('leaving');
    setTimeout(() => layer.remove(), reduced ? 0 : 260);
    actions.closed?.();
  }
  back.addEventListener('click', close);

  size();
  layout(rooms);
  camera.zoom = 0.6;
  fly({ x: 0, y: 0, zoom: 1 }, 1200);
  redraw();
  canvas.focus({ preventScroll: true });
  // A window on the macroverse for whoever is measuring it, the way the room leaves `__pulse`.
  globalThis.__macroverso = { peek: () => ({ live, universes, veins, camera, dark, windows, textures: { ...textures, whole: texturesReady() }, raf }), step: (now) => advance(now), choose: (index) => choose(universes[index] ?? null), open: (node) => openMemory(node) };

  return {
    update(next, nextEnlaces = enlaces) { rooms = next; enlaces = nextEnlaces; layout(next); redraw(); },
    close,
    layer,
  };
}
