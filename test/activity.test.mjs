// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «En marcha» (2026-10-30): what a room says it is doing, what ended a moment ago, and the panel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';
import { RECENT_MS, recentFromLines, runningCount } from '../src/activity.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a room says what it is doing: the turn, what it was asked, its limit and its subagents; stopped, it ends as stopped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-activity-'));
  let room = null;
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    room = new Room({
      store,
      agents: [
        { id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/fake', version: 'test' },
        { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' },
      ],
      projectRoot: root,
      invokers: {
        'claude-readonly': ({ onProgress, signal }) => new Promise((resolve, reject) => {
          onProgress?.({ subagents: [{ id: 's1', kind: 'explore', task: 'Read the README', status: 'running', seconds: 3, report: 'long words' }] });
          signal?.addEventListener('abort', () => reject(Object.assign(new Error('stopped'), { code: 'ABORT' })));
        }),
        'codex-readonly': () => Promise.resolve({ text: 'Done: the README says hello.' }),
      },
    });
    await room.send({ text: 'What does the README say?', target: 'codex' });
    const sent = room.send({ text: 'Review the README with care', target: 'claude' });
    let turn = null;
    for (let tries = 0; tries < 40 && !turn?.subagents.length; tries += 1) { await wait(25); [turn] = room.activity().filter((one) => one.kind === 'turn'); }
    assert.equal(turn.agent, 'claude');
    assert.equal(turn.text, 'Review the README with care');
    assert.ok(turn.timeoutMs > 0, 'the limit rides with the turn');
    assert.deepEqual(turn.subagents, [{ kind: 'explore', task: 'Read the README', status: 'running', seconds: 3 }], 'its subagents, without their report');
    assert.equal(runningCount({ now: room.activity() }), 1);
    assert.equal(await room.stopTurn(turn.messageId), true);
    await Promise.allSettled([sent]);
    assert.deepEqual(room.activity(), []);

    const ended = recentFromLines(await readFile(join(root, 'events.jsonl'), 'utf8'), { since: Date.now() - RECENT_MS, chat: 'main', chatTitle: 'Primer chat' });
    assert.deepEqual(ended.map((one) => [one.agent, one.state]), [['claude', 'stopped'], ['codex', 'ok']], 'newest first');
    assert.equal(ended[0].text, 'Review the README with care');
    assert.equal(ended[1].text, 'What does the README say?');
    assert.ok(ended[1].tookMs >= 0);
    assert.equal(ended[0].chatTitle, 'Primer chat');
    assert.deepEqual(recentFromLines(await readFile(join(root, 'events.jsonl'), 'utf8'), { since: Date.now() + 1000 }), [], 'older than the window is not «a moment ago»');
  } finally {
    await room?.close?.();
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('a plan counts once on the key: its steps live inside it', () => {
  assert.equal(runningCount({ now: [{ kind: 'plan', planId: 'p' }, { kind: 'turn', planId: 'p' }, { kind: 'turn', planId: null }, { kind: 'run' }, { kind: 'install' }] }), 4);
});

test('«En marcha» is on the bar of a project and of Home, served, and stops from where it belongs', async () => {
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const [app, home, page, homePage, server, panel, policy, css] = await Promise.all(['public/app.js', 'public/salas-mac.js', 'public/index.html', 'public/salas-mac.html', 'src/server.mjs', 'public/activity.js', 'src/bridge/policy.mjs', 'public/styles.css'].map(read));
  assert.match(page, /id="activity-button"[\s\S]*?id="activity-count"/);
  assert.match(homePage, /id="sm-tb-activity"[\s\S]*?id="sm-tb-activity-count"/);
  assert.match(app, /activity: \{ nodes: \['#activity-button'\]/);
  assert.match(app, /mountActivity\(\{ key: document\.querySelector\('#activity-button'\)/);
  assert.match(app, /if \(\/\^#chat=\/\.test/);
  assert.match(home, /mountActivity\(\{ key, badge: \$\('sm-tb-activity-count'\)/);
  assert.match(server, /'\/activity\.js'/);
  assert.match(policy, /'\/activity\.js'/, 'the phone loads app.js, which imports it');
  assert.match(server, /url\.pathname === '\/api\/activity'/);
  assert.match(server, /url\.pathname === '\/api\/activity\/stop'/);
  assert.match(server, /if \(viaPhone\) return sendJson\(response, 403/);
  assert.match(panel, /fetch\('\/api\/activity\?everywhere=1'/);
  assert.match(panel, /document\.visibilityState === 'hidden'/, 'it does not ask while the page is out of sight');
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.activity-panel \{/, 'a sheet from the bottom on a narrow screen');
});
