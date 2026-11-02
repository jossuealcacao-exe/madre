import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { confidence, keepHistory, readNpm, rumboModel, signalOf, wilson } from '../src/rumbo.mjs';

// What madre.run's /api/rumbo answers, as the landing's own test builds it (tests/rumbo.test.mjs there).
const funnelReading = () => ({
  ok: true,
  today: '2026-11-01',
  weeks: [
    { start: '2026-10-19', end: '2026-10-25', active: 44, new: 38, activated: 10 },
    { start: '2026-10-26', end: '2026-11-01', active: 205, new: 190, activated: 30 },
  ],
  retention: { d1: { cohort: 199, back: 53 }, d7: { cohort: 65, back: 10 }, bySystem: {} },
  funnel: {
    since: '2026-10-03', new: 255, told: 151, ready: 72, used: 30, aged: 107, back: 19, habit: 5,
    bySystem: { wsl: { new: 116, told: 116, ready: 52, used: 25 }, darwin: { new: 58, told: 23, ready: 14, used: 5 }, win32: { new: 21, told: 1, ready: 1, used: 0 } },
  },
  agents: { claude: { installed: 58, ready: 57, used: 11 } },
  language: { es: 133, en: 11, '?': 7 },
  projects: { known: 144, none: 89, one: 48, few: 5, many: 2 },
  modes: { 1: 220 },
  lifecycle: { installs: 148, uninstalls: 7 },
  errors: { copies: 151, failing: 39 },
});

test('rumbo: a rate says how sure it is, and its signal turns at the thresholds', () => {
  const small = wilson(1, 4);
  const large = wilson(100, 400);
  assert.ok(small.low < 0.25 && small.high > 0.25);
  assert.ok(large.high - large.low < small.high - small.low, 'more copies, a narrower band');
  assert.equal(wilson(0, 0), null);
  assert.deepEqual([confidence(10), confidence(30), confidence(100)], ['low', 'medium', 'high']);
  assert.equal(signalOf(0.5, { good: 0.5, bad: 0.25 }), 'good');
  assert.equal(signalOf(0.3, { good: 0.5, bad: 0.25 }), 'watch');
  assert.equal(signalOf(0.2, { good: 0.5, bad: 0.25 }), 'bad');
  assert.equal(signalOf(0.3, { good: 0.1, bad: 0.25, lower: true }), 'bad', 'where less is better');
  assert.equal(signalOf(null, { good: 0.5, bad: 0.25 }), 'none');
});

test('rumbo: the funnel, the variables and the decisions come from madre.run, GitHub and npm', () => {
  const now = Date.parse('2026-11-01T20:00:00Z');
  const github = {
    repo: { stars: 93, forks: 29, watchers: 2 },
    views: { count: 1556, uniques: 776, days: [{ day: '2026-10-31', count: 1175, uniques: 608 }] },
    clones: { count: 694, uniques: 174 },
    referrers: [{ referrer: 'l.facebook.com', count: 264, uniques: 196 }, { referrer: 'lm.facebook.com', count: 177, uniques: 161 }, { referrer: 'madre.run', count: 115, uniques: 89 }],
    stars: { days: [{ day: '2026-10-22', n: 8 }, { day: '2026-10-31', n: 28 }, { day: '2026-11-01', n: 20 }] },
    installer: { total: 17, byTag: [] },
  };
  const npm = { days: [{ day: '2026-10-29', downloads: 31 }], byVersion: [{ version: '1.1.0', n: 291 }], lastWeek: 291 };
  const model = rumboModel({ madre: funnelReading(), github, npm, now });
  const v = Object.fromEntries(model.variables.map((one) => [one.id, one]));
  assert.deepEqual(model.north, { activated: 30, before: 10, active: 205, new: 190 });
  assert.deepEqual(model.funnel.map((one) => [one.id, one.n]), [['visits', 776], ['downloads', 31], ['new', 255], ['told', 151], ['ready', 72], ['used', 30], ['back', 19], ['habit', 5]]);
  assert.equal(v.used.signal, 'bad');
  assert.equal(v.used.confidence, 'high');
  assert.equal(v.firstProject.k, 55);
  assert.equal(v.growth.value, 2, 'thirty against ten is three times');
  assert.equal(v.starGrowth.now, 48, 'stars of the last seven days');
  assert.equal(v.topSource.source, 'facebook.com', 'Facebook\'s doors are one source');
  assert.equal(v.windowsShare.k, 137);
  const d = Object.fromEntries(model.decisions.map((one) => [one.id, one]));
  assert.equal(d.bottleneck.verdict, 'firstProject', 'the first step in the red, as a person walks them');
  assert.equal(d.bottleneck.figures.noProject, 89);
  assert.equal(d.focus.verdict, 'product');
  assert.equal(d.windows.verdict, 'priority');
  assert.equal(d.pro.verdict, 'early');
  assert.equal(d.quality.verdict, 'fix');
  assert.equal(d.english.verdict, 'spanish');
  assert.equal(model.record.stars, 93);
});

test('rumbo: a source that is missing leaves its part out, not the whole', () => {
  const model = rumboModel({ github: null, npm: null, madre: funnelReading() });
  assert.equal(model.funnel.find((one) => one.id === 'visits').n, null);
  assert.ok(!model.variables.some((one) => one.id === 'starRate'));
  assert.ok(model.variables.some((one) => one.id === 'd1'));
  const bare = rumboModel({ github: { repo: { stars: 3 }, views: null, referrers: [], stars: { days: [] } } });
  assert.equal(bare.north, null);
  assert.deepEqual(bare.decisions, []);
});

test('rumbo: GitHub\'s visits are kept past the 14 days it remembers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-rumbo-history-'));
  try {
    await keepHistory(root, { views: { days: [{ day: '2026-10-01', count: 5, uniques: 3 }] } }, Date.parse('2026-10-02T00:00:00Z'));
    const kept = await keepHistory(root, { views: { days: [{ day: '2026-10-20', count: 9, uniques: 7 }] } }, Date.parse('2026-10-21T00:00:00Z'));
    assert.deepEqual(kept.views, { '2026-10-01': { count: 5, uniques: 3 }, '2026-10-20': { count: 9, uniques: 7 } });
    assert.match(await readFile(join(root, 'rumbo-history.json'), 'utf8'), /2026-10-01/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rumbo: npm is read by day and by version, and nothing comes back when npm does not answer', async () => {
  const asked = [];
  const fetchImpl = async (url) => {
    asked.push(url);
    if (url.includes('/range/')) return new Response(JSON.stringify({ downloads: [{ day: '2026-10-30', downloads: 4 }, { day: '2026-10-31', downloads: 6 }] }));
    return new Response(JSON.stringify({ downloads: { '1.1.1': 205, '1.1.0': 291 } }));
  };
  const npm = await readNpm({ name: '@jossuealcala/madre', fetchImpl, base: 'https://npm.test', now: Date.parse('2026-11-01T00:00:00Z') });
  assert.equal(npm.lastWeek, 496);
  assert.equal(npm.byVersion[0].version, '1.1.0');
  assert.equal(npm.days.length, 2);
  assert.ok(asked.some((url) => url.endsWith('/versions/%40jossuealcala%2Fmadre/last-week')));
  assert.equal(await readNpm({ name: 'x', fetchImpl: async () => new Response('', { status: 503 }), base: 'https://npm.test' }), null);
});

test('home widgets: «MADRE\'s course» exists only with the author\'s token, and joins madre.run\'s funnel', async () => {
  const { createServer } = await import('node:http');
  const { writeSecret } = await import('../src/vault.mjs');
  const { OWNER_VAULT } = await import('../src/server.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-rumbo-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-rumbo-project-'));
  const heard = [];
  const fake = createServer((request, response) => {
    heard.push(`${request.method} ${request.url} ${request.headers.authorization ?? null}`);
    if (request.url === '/api/rumbo') { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(funnelReading())); return; }
    response.writeHead(404);
    response.end();
  });
  const fakePort = await new Promise((resolve) => fake.listen(0, '127.0.0.1', () => resolve(fake.address().port)));
  const saved = { url: process.env.PULSE_RUMBO_URL, npm: process.env.PULSE_NPM_API_URL, gh: process.env.PULSE_GH };
  process.env.PULSE_RUMBO_URL = `http://127.0.0.1:${fakePort}/api/rumbo`;
  process.env.PULSE_NPM_API_URL = `http://127.0.0.1:${fakePort}/npm`;
  process.env.PULSE_GH = '0';
  let server;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: [], invokers: {}, testMode: true }));
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const read = () => fetch(`http://127.0.0.1:${port}/api/salas/widget?kind=rumbo`).then(async (response) => ({ status: response.status, body: await response.json() }));
    assert.equal((await read()).status, 404, 'no token: there is no such widget');
    // Only what this widget would ask counts (CI of v1.1.2, macOS · node 24): another test file, in its
    // own process, can reach a port the system just handed this fake server, and that is not MADRE.
    const mine = heard.filter((line) => / \/(api\/rumbo|npm)\b/.test(line));
    assert.equal(mine.length, 0, `and madre.run is not asked: ${mine.join(' | ')}`);
    assert.equal((await writeSecret(state, OWNER_VAULT, 'usage', 'f'.repeat(64))).ok, true);
    const owner = await read();
    assert.equal(owner.status, 200);
    assert.equal(owner.body.available, true);
    assert.equal(owner.body.north.activated, 30);
    assert.ok(owner.body.decisions.some((one) => one.id === 'bottleneck'));
    assert.ok(heard.includes(`GET /api/rumbo Bearer ${'f'.repeat(64)}`));
    assert.equal(owner.body.sources.github.at, null, 'without a gh session nothing comes from GitHub');
    assert.equal(owner.body.sources.npm.failed, true);
    assert.ok(owner.body.sources.madre.at);
  } finally {
    for (const [key, value] of [['PULSE_RUMBO_URL', saved.url], ['PULSE_NPM_API_URL', saved.npm], ['PULSE_GH', saved.gh]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (server) await new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
    await new Promise((resolve) => fake.close(() => resolve()));
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true });
  }
});
