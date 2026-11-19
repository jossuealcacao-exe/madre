// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

// The Market is apart from MADRE's version (2026-11-19). MADRE App starts MADRE with
// PULSE_UPDATE_CHECK=0 so it does not offer npm, and that switch also shut the Market: nobody in
// the app saw «Imágenes para tus anuncios». Here MADRE is opened as the app opens it.

async function askMarket(env) {
  const state = await realpath(await mkdtemp(join(tmpdir(), 'madre-market-app-state-')));
  const project = await realpath(await mkdtemp(join(tmpdir(), 'madre-market-app-project-')));
  const saved = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
  for (const [name, value] of Object.entries(env)) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  const asked = [];
  const marketFetch = async (url) => { asked.push(String(url)); return new Response('no', { status: 404 }); };
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, marketFetch }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const answer = await fetch(`${base}/api/market`, { headers: { origin: base } }).then((response) => response.json());
    return { off: answer.off, asked: asked.some((url) => url.endsWith('/catalogo.json')) };
  } finally {
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    for (const [name, value] of Object.entries(saved)) if (value === undefined) delete process.env[name]; else process.env[name] = value;
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
}

test('market: inside MADRE App the catalog is asked for, although the app turned the npm check off', async () => {
  const read = await askMarket({ MADRE_APP: '1', PULSE_UPDATE_CHECK: '0', PULSE_MARKET: undefined });
  assert.equal(read.off, false, 'the app said the Market is off');
  assert.equal(read.asked, true, 'the app never asked madre.run for the catalog');
});

test('market: PULSE_MARKET=0 still turns it off inside the app, and outside it the npm check still shuts it', async () => {
  const appOff = await askMarket({ MADRE_APP: '1', PULSE_UPDATE_CHECK: '0', PULSE_MARKET: '0' });
  assert.deepEqual(appOff, { off: true, asked: false });
  const houseOff = await askMarket({ MADRE_APP: undefined, PULSE_UPDATE_CHECK: '0', PULSE_MARKET: undefined });
  assert.deepEqual(houseOff, { off: true, asked: false });
});
