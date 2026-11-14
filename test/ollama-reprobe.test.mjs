import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';

const running = { running: true, host: 'http://o', models: [{ name: 'qwen2.5:3b' }], embedModel: null, chatModel: 'qwen2.5:3b' };
const down = { running: false, host: 'http://o', models: [], embedModel: null, chatModel: null, error: 'The operation was aborted due to timeout' };
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openRoom(probe) {
  const root = await mkdtemp(join(tmpdir(), 'pulse-reprobe-'));
  const project = join(root, 'p');
  await mkdir(project);
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers: {}, ollamaProbe: probe, ollamaRetryMs: [20, 20, 20] });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => { await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); };
  return { base, close };
}

// Carlos's server, 2026-11-12: the project opened while the machine was busy, Ollama did not answer
// the first look in time, and the local AI stayed off for two days, @madre gone and every archive
// batch written by Gemini (L-14).
test('Ollama that did not answer when the project opened is asked again on its own, and @madre comes back (L-14)', async () => {
  const asked = [];
  let awake = false;
  const probe = async (options = {}) => { asked.push(options.timeoutMs ?? null); return awake ? running : down; };
  const { base, close } = await openRoom(probe);
  try {
    const first = await fetch(`${base}/api/state`).then((response) => response.json());
    assert.ok(!first.agents.some((agent) => agent.id === 'madre'), 'no @madre while Ollama has not answered');
    // Busy, then free: it keeps being asked, and the next look after it frees up finds it.
    for (let attempt = 0; attempt < 100 && asked.length < 3; attempt += 1) await wait(20);
    assert.ok(asked.length >= 3, 'asked again on its own while it did not answer');
    awake = true;
    let madre = null;
    for (let attempt = 0; attempt < 100 && !madre; attempt += 1) {
      await wait(20);
      madre = (await fetch(`${base}/api/state`).then((response) => response.json())).agents.find((agent) => agent.id === 'madre');
    }
    assert.ok(madre, '@madre joined once Ollama answered');
    assert.equal(madre.ready, true);
    assert.ok(asked.slice(1).every((ms) => ms >= 5000), 'a second look gives a busy Ollama more time than the first');
    const settled = asked.length;
    await wait(120);
    assert.equal(asked.length, settled, 'nobody keeps asking once Ollama answered');
  } finally {
    await close();
  }
});

test('an Ollama switched off with PULSE_OLLAMA=0 is not asked again (L-14)', async () => {
  const asked = [];
  const probe = async () => { asked.push(1); return { ...down, disabled: true }; };
  const { close } = await openRoom(probe);
  try {
    await wait(120);
    assert.equal(asked.length, 1);
  } finally {
    await close();
  }
});
