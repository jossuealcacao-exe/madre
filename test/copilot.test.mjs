import test from 'node:test';
import assert from 'node:assert/strict';
import { copilotSafe, copilotBrief, COPILOT_WINDOWS } from '../src/room/copilot.mjs';
import { splitCommand } from '../src/runs.mjs';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { createPulseServer } from '../src/server.mjs';

const safe = (line) => copilotSafe(splitCommand(line).argv);

test('copilot: what runs by itself is reading, testing, building and local git — a list of what is allowed', () => {
  for (const line of ['ls -la', 'cat README.md', 'rg -n TODO src', 'git status --short', 'git log -3 --oneline', 'git diff --stat', 'git add src/a.mjs', 'git commit -m "fix: title"', 'git branch',
    'npm test', 'npm run build', 'npm run lint', 'pnpm test', 'pnpm build', 'yarn typecheck', 'npx tsc --noEmit', 'npx vitest run', 'npx playwright test', 'node --test test/a.test.mjs', 'python3 -m pytest -q', 'go test ./...', 'cargo check', 'find src -name a.mjs']) {
    assert.equal(safe(line), true, `${line} should run by itself`);
  }
  for (const line of ['git push', 'git push origin main', 'git reset --hard HEAD~1', 'git checkout main', 'git clean -fd', 'git branch -D old', 'git branch new-one', 'npm publish', 'npm install left-pad', 'npm run deploy', 'npx wrangler deploy', 'npx vercel --prod',
    'rm -rf dist', 'mv a b', 'curl https://example.com', 'node scripts/deploy.mjs', 'node -e "1"', 'find . -delete', 'find . -exec rm {} ;', 'python3 deploy.py', 'cargo fmt', 'open index.html', 'gh release create v1']) {
    assert.equal(safe(line), false, `${line} ran without the human`);
  }
  assert.equal(copilotSafe([]), false);
  assert.equal(copilotSafe(['/usr/bin/git', 'status']), true, 'a full path to a safe program is still that program');
});

test('copilot: up to 24 hours, and the agent is told what stays with the human', () => {
  assert.equal(Math.max(...COPILOT_WINDOWS), 24 * 60);
  const brief = copilotBrief({ until: Date.UTC(2026, 9, 14, 18, 40) });
  assert.match(brief, /until 18:40 UTC/);
  assert.match(brief, /never delete files/);
  assert.match(brief, /never push, publish, deploy or send anything off this machine/);
  assert.match(brief, /up to #3/);
});


const gitInit = (cwd) => new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd }, (error) => (error ? reject(error) : resolve())));
async function waitFor(store, find, { ms = 10000 } = {}) {
  const stop = Date.now() + ms;
  for (;;) {
    const found = find(await store.readAll());
    if (found) return found;
    if (Date.now() > stop) throw new Error('waited in vain');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

test('copilot: a #3 message needs no key while it lasts, reaches an agent capped at #2, and nothing deleted stays deleted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-copilot-'));
  const logDir = await mkdtemp(join(tmpdir(), 'madre-copilot-log-'));
  let room = null;
  try {
    await gitInit(root);
    await writeFile(join(root, 'README.md'), 'v1\n');
    await writeFile(join(root, 'old.txt'), 'keep me\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    const prompts = [];
    let window = { until: Date.now() + 3600_000 };
    room = new Room({ store, agents, projectRoot: root, copilot: () => window, invokers: {
      'codex-readonly': async ({ prompt }) => {
        prompts.push(prompt);
        await writeFile(join(root, 'README.md'), 'v2\n');
        await rm(join(root, 'old.txt'));
        return { text: 'Cambié el README y borré old.txt.', usage: null };
      },
    } });
    // Default ceiling #2: without the copilot, #3 is refused; with it, it reaches this agent.
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 3 })).ok, false, 'without the copilot #3 went past the ceiling');
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 3, copilot: true })).ok, true, 'the copilot did not reach an agent capped at #2');
    window = null;
    assert.equal((await room.modeCheck({ target: 'codex', text: 'x', mode: 3, copilot: true })).ok, false, 'a closed window still opened #3');
    window = { until: Date.now() + 3600_000 };
    await room.send({ text: 'arregla el README', target: 'codex', mode: 3, copilot: true });
    const events = await store.readAll();
    const asked = events.find((event) => event.type === 'message.created' && event.payload.role === 'user');
    assert.equal(asked.payload.copilot, true);
    const reply = events.find((event) => event.type === 'message.created' && event.payload.role === 'assistant');
    assert.equal(reply.payload.copilot, true, 'the reply does not say it was the copilot');
    assert.equal(reply.payload.mode, 3);
    assert.match(prompts[0], /COPILOT: the human made you their copilot/);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'v2\n', 'the copilot could not edit');
    assert.equal(await readFile(join(root, 'old.txt'), 'utf8'), 'keep me\n', 'a file the copilot deleted stayed deleted');
    const changed = events.find((event) => event.type === 'control.changed');
    assert.deepEqual(changed.payload.deletesReverted, ['old.txt']);
  } finally {
    await room?.shutdown().catch(() => {});
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('copilot: the safe lines run by themselves and go back to the agent; the rest wait; a loop stops after its rounds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-copilot-runs-'));
  const logDir = await mkdtemp(join(tmpdir(), 'madre-copilot-runs-log-'));
  let room = null;
  try {
    await gitInit(root);
    await writeFile(join(root, 'README.md'), 'v1\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
    let turns = 0;
    let looping = false;
    room = new Room({ store, agents, projectRoot: root, copilot: () => ({ until: Date.now() + 3600_000 }), invokers: {
      'codex-readonly': async () => {
        turns += 1;
        if (looping || turns === 1) return { text: `Reviso.\n\n\`\`\`pulse-run\nVer el estado\n$ git status --short\n${looping ? '' : '$ rm -rf build\n'}\`\`\``, usage: null };
        return { text: 'Listo.', usage: null };
      },
    } });
    room.setRuns(true);
    await room.send({ text: 'revisa', target: 'codex', mode: 3, copilot: true });
    const first = (await store.readAll()).find((event) => event.type === 'run.requested').payload;
    assert.equal(first.copilot, true);
    const ran = await waitFor(store, (all) => all.find((event) => event.type === 'run.started' && event.payload.index === 0));
    assert.equal(ran.payload.auto, 'copilot');
    // Its answer is in before the human hands it back: on a busy machine `git status` outlived a
    // fixed 300 ms, and «still running» refused the hand-back (2026-10-21).
    await waitFor(store, (all) => all.find((event) => event.type === 'command.output' && event.payload?.run?.responseMessageId === first.responseMessageId && event.payload.run.index === 0));
    await new Promise((resolve) => setTimeout(resolve, 300));
    let events = await store.readAll();
    assert.equal(events.some((event) => event.type === 'run.started' && event.payload.index === 1), false, 'rm ran without the human');
    assert.equal(events.some((event) => event.payload?.returns === first.responseMessageId), false, 'handed back before the human ran or handed the rest');
    // The human hands back what ran: it goes back at #3, still the copilot.
    assert.equal((await room.returnRun({ responseMessageId: first.responseMessageId })).ok, true);
    const back = (await store.readAll()).find((event) => event.payload?.returns === first.responseMessageId);
    assert.equal(back.payload.copilot, true);
    assert.equal(back.payload.mode, 3);

    // A copilot that keeps asking: it stops after the rounds and says so.
    looping = true;
    await room.send({ text: 'sigue', target: 'codex', mode: 3, copilot: true });
    await waitFor(store, (all) => all.find((event) => event.type === 'room.alert' && event.payload.code === 'copilot-rounds'), { ms: 30000 });
    events = await store.readAll();
    assert.ok(events.filter((event) => event.type === 'run.started' && event.payload.auto === 'copilot').length <= 9);
  } finally {
    await room?.shutdown().catch(() => {});
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('copilot: turned on with the #3 key for a chosen while, never from a phone; off, a copilot message is refused', async () => {
  const state = await mkdtemp(join(tmpdir(), 'madre-copilot-srv-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-copilot-srv-project-'));
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const invokers = { 'codex-readonly': async () => ({ text: 'ok' }) };
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents, invokers, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    const name = basename(project);
    assert.equal((await (await fetch(`${base}/api/copilot`)).json()).active, false);
    assert.equal((await post('/api/copilot', { minutes: 60, words: ['nope'] })).status, 403);
    assert.equal((await post('/api/copilot', { minutes: 90, words: [name] })).status, 400, 'a window it does not offer');
    assert.equal((await post('/api/copilot', { minutes: 60, words: [name] }, { 'x-madre-device': 'phone-1' })).status, 403, 'turned on from a phone');
    const on = await (await post('/api/copilot', { minutes: 60, words: [name] })).json();
    assert.equal(on.active, true);
    assert.ok(on.until - Date.now() > 59 * 60000);
    assert.equal((await post('/api/messages', { target: 'codex', text: 'arregla', mode: 3, copilot: true })).status, 202, 'the copilot asked for a key');
    assert.equal((await post('/api/messages', { target: 'codex', text: 'despliega', mode: 4, copilot: true })).status, 403, 'the copilot opened #4');
    assert.equal((await (await post('/api/copilot/off', {})).json()).active, false);
    const refused = await post('/api/messages', { target: 'codex', text: 'arregla', mode: 3, copilot: true });
    assert.equal(refused.status, 409);
    assert.equal((await refused.json()).copilotOff, true);
  } finally {
    await new Promise((resolve) => server?.close(resolve) ?? resolve());
    await rm(state, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  }
});
