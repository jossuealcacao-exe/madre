// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Where the person was, on the Mac and on the phone (docs/MOBILE.md, MOV-005).
//
// One small file for the whole Mac, `~/.pulse/handoff.json`, owner-only: the last place each side
// stood — which room, which conversation, the message at the top of the screen and what was left
// in the box. The other side offers to pick it up from there. A draft is the person's own words,
// so it is kept the way the ledger is kept, beside it, and only the latest one.

import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const DRAFT_LIMIT = 4000;
const SIDES = new Set(['mac', 'phone']);
const file = (root) => join(root, 'handoff.json');

export async function readHandoff(root) {
  try {
    const raw = JSON.parse(await readFile(file(root), 'utf8'));
    return { mac: raw?.mac ?? null, phone: raw?.phone ?? null };
  } catch {
    return { mac: null, phone: null };
  }
}

const text = (value, limit) => (typeof value === 'string' ? value.slice(0, limit) : null);

export async function writeHandoff(root, side, entry, { now = Date.now() } = {}) {
  if (!SIDES.has(side)) throw new Error('Unknown side.');
  const current = await readHandoff(root);
  current[side] = {
    room: text(entry.room, 120),
    project: text(entry.project, 120),
    port: Number.isInteger(entry.port) ? entry.port : null,
    chat: text(entry.chat, 40),
    chatTitle: text(entry.chatTitle, 120),
    anchor: text(entry.anchor, 80),
    draft: text(entry.draft, DRAFT_LIMIT) ?? '',
    kind: side === 'phone' ? text(entry.kind, 20) : null,
    at: now,
  };
  const temporary = `${file(root)}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file(root));
  return current[side];
}
