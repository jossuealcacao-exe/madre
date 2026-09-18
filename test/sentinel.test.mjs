import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ErrorSentinel, redact, fingerprint, repoFromPackage } from '../src/sentinel-errors.mjs';
import { createPulseServer } from '../src/server.mjs';

const pkg = { version: '0.2.0', repository: { type: 'git', url: 'git+https://github.com/jossuealcacao-exe/madre.git' } };
const agents = [
  { id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '0.153.4' },
  { id: 'claude', label: 'Claude', detected: false, ready: false, adapter: 'claude-readonly', path: null, version: null },
];

test('sentinel: redaction removes homes, users, keys, tokens and emails; fingerprints ignore numbers and paths', () => {
  const text = 'ENOENT /Users/ripley/work/app.js by ripley <ripley@weyland.com> key=sk-abcdefghijklmnopqrstuvwxyz token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 https://x.y/z?apikey=123 hex 0123456789abcdef0123456789abcdef';
  const out = redact(text, { home: '/Users/ripley', user: 'ripley' });
  assert.ok(!out.includes('/Users/ripley') && !out.includes('ripley'), out);
  assert.ok(out.includes('[key]') && out.includes('[token]') && out.includes('[email]') && out.includes('[hex]') && out.includes('?…'), out);
  assert.equal(fingerprint('codex', 'timeout after 180s at /a/b/c.mjs:12'), fingerprint('codex', 'timeout after 300s at /x/y/z.mjs:99'));
  assert.notEqual(fingerprint('codex', 'timeout'), fingerprint('gemini', 'timeout'));
  assert.equal(repoFromPackage(pkg), 'jossuealcacao-exe/madre');
  assert.equal(repoFromPackage({}), null);
  assert.equal(redact('word '.repeat(1200)).length, 4000);
});

test('sentinel: unknown failures become redacted reports, known ones do not; repeats fold; auto-report posts when allowed', async () => {
  const events = [];
  const posts = [];
  let saved = null;
  const sentinel = new ErrorSentinel({ pkg, agents, settings: { autoReport: false, reportUrl: '' }, emit: async (type, payload) => events.push({ type, payload }), save: async (settings) => { saved = settings; },
    fetchImpl: async (url, init) => { posts.push({ url, body: JSON.parse(init.body), headers: init.headers }); return { ok: true, status: 202 }; } });
  // A known Gemini condition is MU/TH/UR's business, not the author's.
  assert.equal(await sentinel.observe({ type: 'message.failed', timestamp: '2026-09-18T00:00:00Z', payload: { target: 'gemini', error: 'IneligibleTierError: no longer supported' } }), null);
  const report = await sentinel.observe({ type: 'message.failed', timestamp: '2026-09-18T00:01:00Z', payload: { target: 'codex', error: 'TypeError: cannot read properties of undefined (reading "frobnicate") at /Users/dallas/pulse/src/room.mjs:12' } });
  assert.equal(report.kind, 'unknown');
  assert.equal(report.agent, 'codex');
  assert.ok(!report.error.includes("/Users/dallas"));
  assert.deepEqual(report.agents, ['codex@0.153.4']);
  assert.equal(report.madre, '0.2.0');
  assert.equal(events.at(-1).type, 'sentinel.report');
  // The same shape again within a day folds into the first report.
  assert.equal(await sentinel.observe({ type: 'message.failed', timestamp: '2026-09-18T00:02:00Z', payload: { target: 'codex', error: 'TypeError: cannot read properties of undefined (reading "frobnicate") at /home/dallas/x/room.mjs:99' } }), null);
  assert.equal(sentinel.reports().length, 1);
  assert.equal(sentinel.reports()[0].count, 2);
  // No endpoint: sending is refused, nothing posted.
  assert.equal((await sentinel.send(report.id)).status, 412);
  assert.equal(posts.length, 0);
  // With an endpoint and auto-report on, a new report goes out on its own.
  await sentinel.setSettings({ reportUrl: 'https://collector.example/v1/reports', autoReport: true });
  assert.deepEqual(saved, { autoReport: true, reportUrl: 'https://collector.example/v1/reports' });
  assert.equal(sentinel.settings().canSend, true);
  const crash = await sentinel.crash(new Error('boom'), 'uncaughtException');
  assert.equal(crash.kind, 'crash');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, 'https://collector.example/v1/reports');
  assert.equal(posts[0].body.fingerprint, crash.fingerprint);
  assert.match(posts[0].headers['user-agent'], /^madre\/0\.2\.0/);
  assert.equal(sentinel.report(crash.id).sent.ok, true);
  assert.equal(events.at(-1).type, 'sentinel.sent');
  // The manual road: a prefilled issue, redacted body, and a feedback issue.
  const issue = new URL(sentinel.issueUrl(report.id));
  assert.equal(issue.pathname, '/jossuealcacao-exe/madre/issues/new');
  assert.match(issue.searchParams.get('title'), /^\[sentinel\] unknown condition · @codex · [a-f0-9]{12}$/);
  assert.match(issue.searchParams.get('body'), /MADRE\*\* 0\.2\.0[\s\S]*frobnicate[\s\S]*Redacted automatically/);
  assert.ok(!issue.searchParams.get('body').includes('ripley'));
  assert.match(sentinel.feedbackUrl({ about: 'the memory map' }).toString(), /title=%5Bfeedback%5D\+the\+memory\+map/);
  // Seeding from the ledger restores reports and their sent state.
  const restored = new ErrorSentinel({ pkg, agents });
  restored.seed(events.map((event, index) => ({ ...event, timestamp: `2026-09-18T00:0${index}:00Z` })));
  assert.equal(restored.reports().length, 2);
  assert.equal(restored.report(crash.id).sent.ok, true);
});

test('sentinel: the server records unknown failures, serves the issue link, sends to the collector and persists the switch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-sentinel-'));
  const project = join(root, 'ship');
  await mkdir(project);
  const posts = [];
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/x', version: '1' }];
  const invokers = { 'codex-readonly': async () => { throw new Error('ReferenceError: frobnicator is not defined at /Users/dallas/src/x.mjs:4'); } };
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: root, agents: roster, invokers, reportFetch: async (url, init) => { posts.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 201 }; } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const initial = await fetch(`${base}/api/sentinel`).then((response) => response.json());
    assert.deepEqual(initial.reports, []);
    assert.equal(initial.settings.autoReport, false);
    assert.equal(initial.settings.canSend, false);
    assert.match(initial.feedbackUrl, /github\.com\/.*\/issues\/new\?title=%5Bfeedback%5D/);
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'go', target: 'codex' }) });
    let report = null;
    for (let attempt = 0; attempt < 80 && !report; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 25)); report = (await store.readAll()).find((event) => event.type === 'sentinel.report'); }
    assert.ok(report, 'the failure became a report');
    assert.equal(report.payload.kind, 'unknown');
    assert.ok(!report.payload.error.includes("/Users/dallas"));
    const listed = await fetch(`${base}/api/sentinel`).then((response) => response.json());
    assert.equal(listed.reports.length, 1);
    const id = listed.reports[0].id;
    const issue = await fetch(`${base}/api/sentinel/${id}/issue`).then((response) => response.json());
    assert.match(issue.url, /issues\/new\?title=%5Bsentinel%5D/);
    assert.equal((await fetch(`${base}/api/sentinel/${id}/send`, { method: 'POST' })).status, 412, 'no collector yet');
    const settings = await fetch(`${base}/api/sentinel/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportUrl: 'https://collector.example/v1/reports', autoReport: true }) }).then((response) => response.json());
    assert.equal(settings.settings.canSend, true);
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    assert.deepEqual(config.telemetry, { autoReport: true, reportUrl: 'https://collector.example/v1/reports' });
    const sent = await fetch(`${base}/api/sentinel/${id}/send`, { method: 'POST' });
    assert.equal(sent.status, 200);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].body.id, id);
    assert.ok((await store.readAll()).some((event) => event.type === 'sentinel.sent' && event.payload.ok === true));
    assert.equal((await fetch(`${base}/api/sentinel/ffffffffff/issue`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
