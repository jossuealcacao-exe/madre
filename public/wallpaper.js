// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// Your own wallpaper (1.0.3): a picture of yours behind MADRE, fitted to the screen like the ones
// that ship. The page does here what was done by hand for each of those (wallpapers/ →
// public/assets/wallpapers, and their colours in styles.css): it reads the picture, keeps its
// longest side at SIDE, encodes it, and takes its colours for the veil, the mesh and the tint. The
// server keeps it once for every page (src/looks.mjs); each page still chooses it or not. Shared by
// the room (app.js) and Home (salas-mac.js), which each draw it with their own keys.
import { t } from './i18n.js';

export const CUSTOM_WALL = 'custom';
const SIDE = 2880;
const READ_MAX = 40 * 1024 * 1024;
const SEND_MAX = 8 * 1024 * 1024;
const META_KEY = 'pulse.wallpaper.custom';
const PLUS_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

const node = (tag, className, text) => {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text !== undefined && text !== null) made.textContent = text;
  return made;
};

let current = null;
export const customWall = () => current;
// The last picture this browser knew, so a page paints with it before the server answers.
export function rememberedWall() {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? 'null'); } catch { return null; }
}

// The picture and its colours, as variables on the root (styles.css, --wpc-*): every wallpaper rule
// reads them. `null` takes them away; a page that had chosen it then wears no picture.
const VARIABLES = ['--wpc-url', '--wpc-pos', '--wpc-veil-d', '--wpc-veil-l', '--wpc-tint-d', '--wpc-tint-l', '--wpc-m1-d', '--wpc-m2-d', '--wpc-m3-d', '--wpc-m1-l', '--wpc-m2-l', '--wpc-m3-l'];
export function paintCustomWall(meta, root = globalThis.document?.documentElement) {
  current = meta ?? null;
  try { if (current) localStorage.setItem(META_KEY, JSON.stringify(current)); else localStorage.removeItem(META_KEY); } catch { /* this page only */ }
  const style = root?.style;
  if (!style?.setProperty) return;
  if (!current) { for (const name of VARIABLES) style.removeProperty(name); return; }
  const rgb = (colour) => colour.join(' ');
  const { dark, light } = current.palette;
  style.setProperty('--wpc-url', `url("/api/looks/wallpaper?v=${current.v}")`);
  style.setProperty('--wpc-pos', `${current.focus.x}% ${current.focus.y}%`);
  style.setProperty('--wpc-veil-d', rgb(dark.veil));
  style.setProperty('--wpc-veil-l', rgb(light.veil));
  style.setProperty('--wpc-tint-d', rgb(dark.tint));
  style.setProperty('--wpc-tint-l', rgb(light.tint));
  dark.mesh.forEach((colour, index) => style.setProperty(`--wpc-m${index + 1}-d`, rgb(colour)));
  light.mesh.forEach((colour, index) => style.setProperty(`--wpc-m${index + 1}-l`, rgb(colour)));
}

// Its colours, the way the shipped ones were taken: the whole for the veil and the tint, and three
// corners for the mesh (top left, right, bottom), each pressed towards the theme's ground.
function paletteOf(source) {
  const canvas = node('canvas');
  canvas.width = 48;
  canvas.height = 32;
  const ink = canvas.getContext('2d', { willReadFrequently: true });
  ink.drawImage(source, 0, 0, 48, 32);
  const { data } = ink.getImageData(0, 0, 48, 32);
  const average = (x0, y0, x1, y1) => {
    const sum = [0, 0, 0];
    let count = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const at = (y * 48 + x) * 4;
        if (data[at + 3] < 16) continue;
        sum[0] += data[at]; sum[1] += data[at + 1]; sum[2] += data[at + 2];
        count += 1;
      }
    }
    return count ? sum.map((value) => value / count) : [128, 128, 128];
  };
  const toward = (colour, ground, k) => colour.map((value, index) => Math.max(0, Math.min(255, Math.round(value * (1 - k) + ground[index] * k))));
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const whole = average(0, 0, 48, 32);
  const corners = [average(0, 0, 20, 13), average(28, 0, 48, 19), average(8, 20, 40, 32)];
  return {
    dark: { veil: toward(whole, black, 0.93), tint: toward(whole, black, 0.86), mesh: [toward(corners[0], black, 0.76), toward(corners[1], black, 0.66), toward(corners[2], black, 0.88)] },
    light: { veil: toward(whole, white, 0.94), tint: toward(whole, white, 0.95), mesh: [toward(corners[0], white, 0.88), toward(corners[1], white, 0.92), toward(corners[2], white, 0.86)] },
  };
}

const encode = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
// The picture fitted and encoded, with its size and its colours. WebP where the browser writes it,
// JPEG where it does not; smaller again if it still weighs more than the server keeps.
export async function prepareWallpaper(file) {
  if (!file) throw new Error(t('Choose a picture: a PNG, JPEG or WebP file.'));
  if (file.size > READ_MAX) throw new Error(t('That picture is too large to read (more than 40 MB).'));
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(t('That picture could not be read. Try a PNG, JPEG or WebP.')); }
  const scale = Math.min(1, SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = node('canvas');
  canvas.width = w;
  canvas.height = h;
  const ink = canvas.getContext('2d');
  ink.imageSmoothingQuality = 'high';
  ink.drawImage(bitmap, 0, 0, w, h);
  const palette = paletteOf(bitmap);
  bitmap.close?.();
  let blob = await encode(canvas, 'image/webp', 0.86);
  if (!blob || blob.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', 0.88);
  for (const quality of [0.74, 0.6]) if (blob && blob.size > SEND_MAX) blob = await encode(canvas, blob.type, quality);
  if (!blob || blob.size > SEND_MAX) throw new Error(t('That picture could not be prepared.'));
  return { blob, w, h, palette };
}

export async function uploadWallpaper(file, { focus = { x: 50, y: 50 } } = {}) {
  const { blob, w, h, palette } = await prepareWallpaper(file);
  const response = await fetch('/api/looks/wallpaper', {
    method: 'PUT',
    headers: { 'content-type': blob.type, 'x-madre-wallpaper': encodeURIComponent(JSON.stringify({ w, h, focus, palette })) },
    body: blob,
  });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok || !answer.custom) throw new Error(answer.error ?? t('That picture could not be kept.'));
  return answer.custom;
}
async function sendFrame(focus) {
  const response = await fetch('/api/looks/wallpaper/frame', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(focus) });
  const answer = await response.json().catch(() => ({}));
  return response.ok ? answer.custom ?? null : null;
}
async function dropWallpaper() {
  await fetch('/api/looks/wallpaper', { method: 'DELETE' }).catch(() => null);
}

// The browser's own chooser, opened from the press that asked for it.
export function pickPicture() {
  return new Promise((resolve) => {
    const input = node('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

// The tile among the wallpapers: the picture when there is one; a «+» to add it when there is not.
export function customTile(paper, meta) {
  paper.dataset.wp = CUSTOM_WALL;
  paper.classList.toggle('paper-add', !meta);
  const swatch = node('span', 'paper-swatch');
  if (!meta) swatch.innerHTML = PLUS_ICON; // trusted: our own SVG string
  paper.append(swatch, node('span', 'paper-name', t('Your picture')));
  if (!meta) paper.title = t('Choose a picture of yours as the wallpaper');
  return paper;
}

// Adding it: the chooser, the picture prepared and kept, and then it is this page's wallpaper.
// `busy` marks the tile while that happens; `chosen` hands the kept picture back.
export async function addPicture({ busy = null, chosen, failed }) {
  const file = await pickPicture();
  if (!file) return;
  busy?.classList.add('busy');
  busy?.setAttribute('aria-busy', 'true');
  try {
    const meta = await uploadWallpaper(file);
    paintCustomWall(meta);
    chosen(meta);
  } catch (error) {
    failed(error.message);
  } finally {
    busy?.classList.remove('busy');
    busy?.removeAttribute('aria-busy');
  }
}

// The frame drawn last follows the window's proportions; one listener for the page, not one per drawing.
let placeFrame = null;
globalThis.addEventListener?.('resize', () => placeFrame?.());

// Under the tiles while it is chosen: where the screen falls on the picture, and the picture
// changed or taken away. The whole picture, and over it the part the screen shows, in the screen's
// own proportions; carried by hand (or by the arrows) to the part that should stay in view.
export function customTools(meta, { changed, removed, failed, button }) {
  const box = node('div', 'wall-tools');
  const head = node('div', 'wall-tools-head');
  const words = node('div', 'wall-tools-words');
  words.append(node('b', null, t('Framing')));
  const hint = node('span', 'wall-tools-hint');
  words.append(hint);
  head.append(words);
  const frame = node('div', 'wall-frame');
  const fit = node('span', 'wall-frame-fit');
  const picture = node('img', 'wall-frame-pic');
  picture.alt = '';
  picture.src = `/api/looks/wallpaper?v=${meta.v}`;
  picture.draggable = false;
  const view = node('span', 'wall-frame-view');
  view.tabIndex = 0;
  view.setAttribute('role', 'slider');
  view.setAttribute('aria-label', t('Framing of your picture'));
  fit.append(picture, view);
  frame.append(fit);
  let focus = { ...meta.focus };
  const sides = () => {
    const pictureRatio = meta.w / meta.h;
    const screen = (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
    return { fw: Math.min(1, screen / pictureRatio), fh: Math.min(1, pictureRatio / screen) };
  };
  const free = () => { const { fw, fh } = sides(); return fw < 0.995 ? 'x' : fh < 0.995 ? 'y' : null; };
  const place = () => {
    const { fw, fh } = sides();
    view.style.width = `${fw * 100}%`;
    view.style.height = `${fh * 100}%`;
    view.style.left = `${(1 - fw) * focus.x}%`;
    view.style.top = `${(1 - fh) * focus.y}%`;
    const axis = free();
    frame.dataset.free = axis ?? 'none';
    hint.textContent = axis ? t('Drag the frame to choose which part of your picture stays in view.') : t('Your picture fills the screen as it is.');
    view.setAttribute('aria-valuetext', `${Math.round(axis === 'y' ? focus.y : focus.x)}%`);
  };
  const live = () => globalThis.document?.documentElement?.style?.setProperty('--wpc-pos', `${focus.x}% ${focus.y}%`);
  const settle = async () => {
    const kept = await sendFrame(focus);
    if (kept) { paintCustomWall(kept); changed(kept, { reframed: true }); } else failed(t('The framing could not be kept.'));
  };
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
  const follow = (event) => {
    const area = fit.getBoundingClientRect();
    const { fw, fh } = sides();
    const u = (event.clientX - area.left) / area.width;
    const v = (event.clientY - area.top) / area.height;
    if (fw < 0.995) focus.x = clamp(((u - fw / 2) / (1 - fw)) * 100);
    if (fh < 0.995) focus.y = clamp(((v - fh / 2) / (1 - fh)) * 100);
    place();
    live();
  };
  fit.addEventListener('pointerdown', (event) => {
    if (!free()) return;
    event.preventDefault();
    fit.setPointerCapture?.(event.pointerId);
    frame.classList.add('moving');
    follow(event);
    const move = (next) => follow(next);
    const up = () => {
      fit.removeEventListener('pointermove', move);
      frame.classList.remove('moving');
      void settle();
    };
    fit.addEventListener('pointermove', move);
    fit.addEventListener('pointerup', up, { once: true });
    fit.addEventListener('pointercancel', up, { once: true });
  });
  view.addEventListener('keydown', (event) => {
    const axis = free();
    const step = { ArrowLeft: -5, ArrowUp: -5, ArrowRight: 5, ArrowDown: 5 }[event.key];
    if (!axis || step === undefined) return;
    event.preventDefault();
    focus[axis] = clamp(focus[axis] + step);
    place();
    live();
    void settle();
  });
  picture.addEventListener('load', place, { once: true });
  placeFrame = place;
  place();
  const acts = node('div', 'wall-tools-acts');
  const change = button(t('Change picture'), () => void addPicture({ busy: change, chosen: (kept) => changed(kept, { reframed: false }), failed }));
  const remove = button(t('Remove'), async () => {
    remove.disabled = true;
    await dropWallpaper();
    paintCustomWall(null);
    removed();
  });
  acts.append(change, remove);
  box.append(head, frame, acts);
  return box;
}
