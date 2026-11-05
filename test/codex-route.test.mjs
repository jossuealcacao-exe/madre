// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Room } from '../src/room.mjs';
import { EventStore } from '../src/event-store.mjs';
import { agentRouteFromEnvironment } from '../src/runtime-detection.mjs';
import { codexRoute } from '../src/codex-route.mjs';
import { createPulseServer } from '../src/server.mjs';

test('Codex config gateway is blocked before MADRE prepares its briefing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-codex-route-'));
  const oldHome = process.env.CODEX_HOME;
  const oldBase = process.env.OPENAI_BASE_URL;
  const oldAllow = process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS;
  try {
    const home = join(root, 'codex');
    await mkdir(home);
    await writeFile(join(home, 'config.toml'), 'model_provider = "gateway"\n[model_providers.gateway]\nbase_url = "https://gateway.example.test/v1?token=private"\n');
    process.env.CODEX_HOME = home;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS;
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    let invoked = false;
    const room = new Room({
      store,
      projectRoot: root,
      agents: [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test', route: agentRouteFromEnvironment('codex', {}) }],
      invokers: { 'codex-readonly': async () => { invoked = true; return { text: 'should not run', usage: null }; } },
    });
    await room.send({ text: 'private question', target: 'codex' });
    const events = await store.readAll();
    assert.equal(invoked, false);
    assert.deepEqual(events.map((event) => event.type), ['message.created', 'message.failed']);
    assert.match(events.at(-1).payload.error, /blocked @codex before sending the briefing/);
    assert.match(events.at(-1).payload.error, /gateway\.example\.test/);
    assert.doesNotMatch(JSON.stringify(events), /token=private/);
    await writeFile(join(home, 'config.toml'), '"openai_base_url" = "https://gateway.example.test/v1"\n');
    process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS = 'codex';
    await room.send({ text: 'unknown route', target: 'codex' });
    const unknown = (await store.readAll()).at(-1).payload.error;
    assert.match(unknown, /blocked @codex/);
    assert.doesNotMatch(unknown, /PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS/, 'a route with no identified host cannot be authorized');
    delete process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS;
    await writeFile(join(home, 'config.toml'), 'openai_base_url = "https://api.openai.com/v1"\n');
    await room.send({ text: 'safe retry', target: 'codex' });
    assert.equal(invoked, true, 'a room that was blocked can use an official route after config changes');
  } finally {
    if (oldHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldHome;
    if (oldBase === undefined) delete process.env.OPENAI_BASE_URL; else process.env.OPENAI_BASE_URL = oldBase;
    if (oldAllow === undefined) delete process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS; else process.env.PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS = oldAllow;
    await rm(root, { recursive: true, force: true });
  }
});

test('Codex route checks config URLs, explicit trust, and ambiguous TOML without exposing URL details', async () => {
  const home = await mkdtemp(join(tmpdir(), 'madre-codex-config-'));
  const config = join(home, 'config.toml');
  try {
    await writeFile(config, 'openai_base_url = "https://api.openai.com/v1"\n');
    assert.equal((await codexRoute({ env: { CODEX_HOME: home } })).custom, false);
    await writeFile(config, 'openai_base_url = "http://api.openai.com/v1"\n');
    assert.equal((await codexRoute({ env: { CODEX_HOME: home } })).custom, true);
    await writeFile(config, 'openai_base_url = "https://gateway.example.test/private?token=secret"\n');
    const blocked = await codexRoute({ env: { CODEX_HOME: home } });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.host, 'gateway.example.test');
    assert.doesNotMatch(JSON.stringify(blocked), /private|secret/);
    assert.equal((await codexRoute({ env: { CODEX_HOME: home, PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS: 'codex' } })).allowed, true);
    assert.equal((await codexRoute({ env: { CODEX_HOME: home, PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS: 'claude' } })).allowed, false);
    await writeFile(config, '"openai_base_url" = "https://gateway.example.test/v1"\n');
    assert.equal((await codexRoute({ env: { CODEX_HOME: home } })).custom, true, 'unparsed routing keys must fail closed');
    assert.equal((await codexRoute({ env: { CODEX_HOME: home, PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS: 'codex' } })).allowed, false, 'explicit trust cannot authorize a route whose destination is unknown');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('the room roster shows the Codex destination from user configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-codex-roster-'));
  const oldHome = process.env.CODEX_HOME;
  try {
    await writeFile(join(root, 'config.toml'), 'openai_base_url = "https://gateway.example.test/v1"\n');
    process.env.CODEX_HOME = root;
    const provided = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test', route: agentRouteFromEnvironment('codex', {}) }];
    const { agents, server } = await createPulseServer({ projectRoot: root, stateRoot: join(root, 'state'), agents: provided, detect: async () => provided, probe: async () => ({}) });
    assert.equal(agents[0].route.host, 'gateway.example.test');
    assert.equal(agents[0].route.allowed, false);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    await new Promise((resolve) => server.close(resolve));
  } finally {
    if (oldHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldHome;
    await rm(root, { recursive: true, force: true });
  }
});
