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

import { isForbidden } from './checkpoint.mjs';

export const OPERATIONS = ['copy', 'move', 'new-file', 'new-folder'];
// The two that make something out of nothing: they have a destination and no source.
export const CREATIONS = ['new-file', 'new-folder'];

// Whether a path is one the room guards. Both ends count: moving something harmless ONTO a
// protected path is how a protected path gets overwritten.
export function needsDesignation(...paths) {
  return paths.filter(Boolean).some((path) => isForbidden(String(path).replace(/^\.\//, '')));
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
