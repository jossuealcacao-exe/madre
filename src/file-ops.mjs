// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Copying and moving a file, from the human's own hands.
//
// Everything else in MADRE that writes into a project is an agent under a permission mode. This
// is not that: it is the human, in their own project, doing what a file manager does. So there
// is no mode and no lease — but there are still two fences, because a slip of the hand is not
// an argument for losing a .env.
//
//   · the project is the world. Both ends resolve inside it or the operation does not happen,
//     and that is checked after following symlinks, not before.
//   · the zones MADRE protects from agents are protected from accidents too. Touching .git,
//     .pulse, .madre, a .env or the local settings asks for the project's designation first —
//     the same word the room asks for before CONTROL. Typing a folder name is a small ceremony;
//     restoring a deleted key is not.

import { realpath } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { isForbidden } from './checkpoint.mjs';

export const OPERATIONS = ['copy', 'move', 'new-file', 'new-folder'];
// The two that make something out of nothing: they have a destination and no source.
export const CREATIONS = ['new-file', 'new-folder'];

// Whether a path is one the room guards. Both ends count: moving something harmless ONTO a
// protected path is how a protected path gets overwritten.
export function needsDesignation(...paths) {
  return paths.filter(Boolean).some((path) => isForbidden(String(path).replace(/^\.\//, '')));
}

// The same question asked of where a path really lands (2026-10-12, SRV-05 of the 1.0 review): the
// words of a path are not its place. `src/../.git/config`, a link named `gitlink` that points at
// `.git`, `.ENV` on a disk that does not tell it from `.env` — each wrote into a guarded zone with
// no designation, because only the words were read. A path that does not exist yet is judged by
// the real folder it would land in.
export async function needsDesignationOnDisk(root, ...paths) {
  if (needsDesignation(...paths)) return true;
  const top = await realpath(root).catch(() => null);
  if (!top) return false;
  for (const path of paths.filter(Boolean)) {
    const wanted = resolve(top, String(path).replace(/^\/+/, ''));
    const real = await realpath(wanted).catch(async () => {
      const folder = await realpath(dirname(wanted)).catch(() => null);
      return folder ? join(folder, basename(wanted)) : null;
    });
    if (!real || (real !== top && !real.startsWith(top + sep))) continue;   // outside: the fence refuses it elsewhere
    if (needsDesignation(relative(top, real).split(sep).join('/'))) return true;
  }
  return false;
}

// What the room will say about an operation before doing any of it.
export function planFileOp({ operation, from, to }) {
  if (!OPERATIONS.includes(operation)) return { ok: false, error: `Unknown operation: ${operation}.` };
  const source = String(from ?? '').replace(/^\/+/, '').trim();
  const target = String(to ?? '').replace(/^\/+/, '').trim();
  if (CREATIONS.includes(operation)) {
    if (!target) return { ok: false, error: 'A name is needed.' };
    // A name, not a path: making something is done where the human is looking, and a slash in
    // the box would quietly write somewhere else.
    const name = target.slice(target.lastIndexOf('/') + 1);
    if (!name || name === '.' || name === '..') return { ok: false, error: 'That is not a name.' };
    return { ok: true, operation, from: null, to: target, guarded: needsDesignation(target) };
  }
  if (!source || !target) return { ok: false, error: 'Both a source and a destination are needed.' };
  if (source === target) return { ok: false, error: 'The source and the destination are the same path.' };
  // Moving a folder into itself leaves nothing behind and no way back.
  if (operation === 'move' && `${target}/`.startsWith(`${source}/`)) return { ok: false, error: 'A folder cannot be moved inside itself.' };
  return { ok: true, operation, from: source, to: target, guarded: needsDesignation(source, target) };
}

// The name a copy takes when its own is already used where it lands: "notes copy.md", then
// "notes copy 2.md", the way a file manager does it. `word` is the room's word for "copy", and
// `taken` answers whether a project-relative path already holds something.
export async function freeCopyPath(to, { taken, word = 'copy', limit = 100 }) {
  const path = String(to ?? '').replace(/^\/+/, '').trim();
  if (!path || !(await taken(path))) return path;
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const name = path.slice(slash + 1);
  // A leading dot is part of the name (".env"), not an extension.
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 1; n <= limit; n += 1) {
    const candidate = `${dir}${stem} ${word}${n > 1 ? ` ${n}` : ''}${ext}`;
    if (!(await taken(candidate))) return candidate;
  }
  return path;
}
