// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Whether this computer is already busy, for the work MADRE does in the background with the local AI
// (L-11, Carlos's server, 2026-11-04): ordering the memory with qwen2.5:3b and the embeddings with
// nomic took every core while Carlos ran his own model, each runner wanting all sixteen — a load of
// 32, and his questions waited behind ours. Background work that nobody is waiting for yields: with
// the load at three quarters of the cores or more it is tried again later, never handed to a paid
// agent instead. Windows reports no load (zeros), so there it never waits.

import { availableParallelism, loadavg } from 'node:os';

export const BUSY_WAIT_MS = 5 * 60 * 1000;

export function machineBusy({ load = loadavg()[0], cores = availableParallelism(), share = Number(process.env.PULSE_BUSY_SHARE) || 0.75 } = {}) {
  return cores > 0 && Number.isFinite(load) && load >= cores * share;
}
