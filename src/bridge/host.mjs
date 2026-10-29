// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Who keeps the bridge up. Every room on this Mac offers to; the port decides.
//
// No process of its own and nothing to start: each room, every few seconds, asks whether a phone
// should be able to reach this Mac right now — the phone is on, a phone is paired or a code is
// waiting, and the network is one the person trusts — and if so tries to open the bridge's port.
// The first room that gets it hosts the bridge; the others find it taken and leave it be. When the
// hosting room closes, the next one to ask takes over. On a network nobody trusted, whoever hosts
// it closes it.

import { readStore } from './devices.mjs';
import { currentNetwork } from './network.mjs';
import { BRIDGE_PORT, createBridge } from './server.mjs';

// `allowed`: whether this Mac offers the phone at all (MADRE 1.0 keeps it a preview, src/server.mjs).
export function hostBridge({ root, publicDirectory, port = BRIDGE_PORT, every = 15_000, network = currentNetwork, listenHost = '0.0.0.0', allowed = async () => true, log = (line) => console.error(line) }) {
  let server = null;
  let running = null;
  let timer = null;
  let last = { network: null, trusted: false, wanted: false };

  const open = () => new Promise((resolve) => {
    const candidate = createBridge({ root, port, publicDirectory });
    candidate.once('error', (error) => resolve(error.code === 'EADDRINUSE' ? null : (log(`MADRE bridge: ${error.message}`), null)));
    candidate.listen(port, listenHost, () => resolve(candidate));
  });
  const close = () => new Promise((resolve) => {
    if (!server) return resolve();
    const closing = server;
    server = null;
    closing.closeAllConnections?.();
    closing.close(() => resolve());
  });

  async function settle() {
    const store = await readStore(root);
    const now = Date.now();
    const waiting = store.invites.some((one) => !one.redeemedAt && one.expiresAt > now);
    const wanted = (await allowed()) && store.enabled && (store.devices.length > 0 || waiting);
    const here = wanted ? await network().catch(() => null) : null;
    const trusted = Boolean(here && store.networks.some((one) => one.id === here.id));
    last = { network: here, trusted, wanted };
    if (wanted && trusted && !server) server = await open();
    else if ((!wanted || !trusted) && server) await close();
    return status();
  }

  // One at a time: a tick asked for while another runs waits for it and runs again.
  function tick() {
    running = (running ?? Promise.resolve()).then(settle, settle).catch((error) => { log(`MADRE bridge: ${error.message}`); return status(); });
    return running;
  }

  function status() {
    return { hosting: Boolean(server), port, network: last.network, trusted: last.trusted, wanted: last.wanted };
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => { void tick(); }, every);
      timer.unref?.();
      void tick();
    },
    tick,
    status,
    async stop() {
      clearInterval(timer);
      timer = null;
      await close();
    },
  };
}

// Is a bridge up on this Mac, whichever room hosts it?
export async function bridgeAnswers(port = BRIDGE_PORT) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/bridge/ping`, { signal: AbortSignal.timeout(600) });
    return response.ok && (await response.json()).madre === true;
  } catch {
    return false;
  }
}
