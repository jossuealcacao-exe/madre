import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInvite, deviceForToken, deviceKind, forgetDevice, readStore, redeemInvite, trustNetwork, withStore, SESSION_MS } from '../src/bridge/devices.mjs';
import { currentNetwork, isPrivateAddress, lanAddresses, normaliseMac, parseDarwinArp, parseDarwinRoute, parseDarwinSummary, parseLinuxArp, parseLinuxRoute } from '../src/bridge/network.mjs';
import { phonePolicy, PHONE_MAX_MODE } from '../src/bridge/policy.mjs';
import { createBridge, ownHosts, parseCookies, roomsOnThisMac } from '../src/bridge/server.mjs';
import { readHandoff, writeHandoff } from '../src/bridge/handoff.mjs';
import { createPulseServer } from '../src/server.mjs';
import { updateConfig } from '../src/config.mjs';

const publicDirectory = join(import.meta.dirname, '..', 'public');
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });

test('phone · an invitation works once, for ten minutes, and the store keeps fingerprints, never tokens', async () => {
  const root = await scratch('madre-phone-store-');
  try {
    const now = 1_000_000;
    const invite = await createInvite(root, { now });
    const paired = await redeemInvite(root, invite.code, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', now: now + 1000 });
    assert.equal(paired.device.kind, 'iphone');
    assert.equal(await redeemInvite(root, invite.code, { now: now + 2000 }), null, 'a code worked twice');
    const late = await createInvite(root, { now });
    assert.equal(await redeemInvite(root, late.code, { now: now + 11 * 60 * 1000 }), null, 'a code outlived its ten minutes');

    const raw = await readFile(join(root, 'devices.json'), 'utf8');
    assert.ok(!raw.includes(paired.token) && !raw.includes(invite.code), 'a token or a code was written down');
    assert.equal((await stat(join(root, 'devices.json'))).mode & 0o777, 0o600);
    assert.equal((await stat(join(root, 'credentials', 'bridge.key'))).mode & 0o777, 0o600);

    assert.equal((await deviceForToken(root, paired.token, { now: now + 5000 }))?.id, paired.device.id);
    assert.equal(await deviceForToken(root, 'x'.repeat(43), { now: now + 5000 }), null);
    assert.equal(await deviceForToken(root, paired.token, { now: now + 1000 + SESSION_MS }), null, 'a phone unseen for thirty days still got in');
    await forgetDevice(root, paired.device.id);
    assert.equal(await deviceForToken(root, paired.token, { now: now + 6000 }), null, 'a forgotten phone still got in');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('phone · two rooms writing the list at once lose nothing', async () => {
  const root = await scratch('madre-phone-lock-');
  try {
    await Promise.all(Array.from({ length: 12 }, (_, n) => withStore(root, (store) => { store.networks.push({ id: `net-${n}`, name: null, addedAt: n }); })));
    assert.equal((await readStore(root)).networks.length, 12);
    await trustNetwork(root, { id: 'net-3' });
    assert.equal((await readStore(root)).networks.length, 12, 'trusting a known network twice added it twice');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('phone · a phone is told by its kind, never by its whole user agent', () => {
  assert.equal(deviceKind('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36'), 'android');
  assert.equal(deviceKind('Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36'), 'android-tablet');
  assert.equal(deviceKind('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'ipad');
  assert.equal(deviceKind('curl/8'), 'other');
});

test('phone · a network is known by its router, read from the tables the system keeps', async () => {
  assert.deepEqual(parseDarwinRoute('   route to: default\n    gateway: 192.168.100.1\n  interface: en0\n'), { gateway: '192.168.100.1', device: 'en0' });
  assert.equal(parseDarwinArp('? (192.168.100.1) at e8:13:6e:21:6a:16 on en0 ifscope [ethernet]'), 'e8:13:6e:21:6a:16');
  assert.equal(normaliseMac('0:1A:2b:3:4:5'), '00:1a:2b:03:04:05');
  // When the neighbour table is hidden, the router's address still comes from IPv6.
  assert.equal(parseDarwinSummary('  SERVERID (2) Length 14: DUID LLT HW 1 Time 3695437727 Addr e8:13:6e:21:6a:16\n'), 'e8:13:6e:21:6a:16');
  assert.equal(parseDarwinSummary('        source link-address option (1), length 8 (1): e8:13:6e:21:6a:16\n'), 'e8:13:6e:21:6a:16');
  assert.equal(parseDarwinSummary('  chaddr = 7e:b9:26:ac:83:91\n  CLIENTID (1) Length 10: DUID LL HW 1 Addr 7e:b9:26:ac:83:91\n'), null, 'the Mac\'s own address was taken for the router\'s');
  assert.equal(normaliseMac('ff:ff:ff:ff:ff:ff'), null);
  assert.deepEqual(parseLinuxRoute('Iface\tDestination\tGateway\nwlan0\t00000000\t0101A8C0\n'), { gateway: '192.168.1.1', device: 'wlan0' });
  assert.equal(parseLinuxArp('IP address HW type Flags HW address Mask Device\n192.168.1.1 0x1 0x2 aa:bb:cc:dd:ee:ff * wlan0\n', '192.168.1.1'), 'aa:bb:cc:dd:ee:ff');
  const routes = { '/sbin/route': '    gateway: 10.0.0.1\n  interface: en0\n', '/usr/sbin/arp': '? (10.0.0.1) at 2:0:0:0:0:1 on en0' };
  const one = await currentNetwork({ platform: 'darwin', exec: async (file) => routes[file] });
  const other = await currentNetwork({ platform: 'darwin', exec: async (file) => (file === '/usr/sbin/arp' ? '? (10.0.0.1) at 2:0:0:0:0:2 on en0' : routes[file]) });
  assert.equal(one.gateway, '10.0.0.1');
  assert.notEqual(one.id, other.id, 'two routers at the same address are one network');
  assert.equal(await currentNetwork({ platform: 'win32' }), null, 'a network MADRE cannot read is not unknown');
  // A router the system forgot is looked up again once, with a nudge.
  let asked = 0;
  let poked = 0;
  const forgotten = await currentNetwork({ platform: 'darwin', poke: async () => { poked += 1; }, exec: async (file) => (file === '/sbin/route' ? routes[file] : (asked += 1) === 1 ? '' : routes[file]) });
  assert.equal(poked, 1);
  assert.equal(forgotten.id, one.id);
  for (const address of ['192.168.1.20', '10.2.3.4', '172.20.0.9', '127.0.0.1', '::1', '::ffff:192.168.0.3', 'fe80::1', 'fd12::3']) assert.ok(isPrivateAddress(address), address);
  for (const address of ['8.8.8.8', '172.32.0.1', '100.64.0.1', '2001:db8::1', '']) assert.ok(!isPrivateAddress(address), address);
  assert.deepEqual(lanAddresses({ device: 'en1', interfaces: { lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }], en0: [{ family: 'IPv4', address: '192.168.1.9', internal: false }], en1: [{ family: 'IPv4', address: '10.0.0.4', internal: false }] } }), ['10.0.0.4', '192.168.1.9']);
});

test('phone · the policy: reading is wide, acting is narrow, and #3 and #4 stay on the Mac', () => {
  assert.equal(PHONE_MAX_MODE, 2);
  for (const pathname of ['/', '/app.js', '/styles.css', '/api/state', '/api/events', '/api/chats', '/api/memory/12/traffic', '/assets/brand/logo.svg', '/preview/project/README.md', '/api/glance']) assert.ok(phonePolicy({ method: 'GET', pathname }).allow, pathname);
  for (const pathname of ['/api/can-frame', '/api/x/github/secret', '/api/agents/opencode/models', '/api/sentinel/abcdef0123/issue']) assert.ok(!phonePolicy({ method: 'GET', pathname }).allow, pathname);
  for (const [method, pathname] of [['POST', '/api/stop-all'], ['POST', '/api/stop-turn'], ['POST', '/api/runs'], ['POST', '/api/chats'], ['POST', '/api/chats/ab12'], ['PATCH', '/api/chats/ab12'], ['POST', '/api/plans/0b1c-2d/stop'], ['POST', '/api/eyecat/confirm'], ['POST', '/api/attachments'], ['POST', '/api/handoff']]) assert.ok(phonePolicy({ method, pathname }).allow, `${method} ${pathname}`);
  for (const [method, pathname] of [['POST', '/api/agents/claude/key'], ['POST', '/api/x/github/secret'], ['POST', '/api/extensions/install-file'], ['POST', '/api/extensions/upload'], ['DELETE', '/api/extensions/mine'], ['POST', '/api/privacy/purge'], ['DELETE', '/api/chats/ab12'], ['DELETE', '/api/memory/3'], ['PUT', '/api/files'], ['POST', '/api/updates/apply'], ['POST', '/api/phone/invite'], ['POST', '/api/tree/op'], ['POST', '/api/ollama/install'], ['POST', '/api/ollama/pull']]) assert.ok(!phonePolicy({ method, pathname }).allow, `${method} ${pathname}`);
  // Settings go through, except permissions and the key that opens #3 and #4.
  for (const [method, pathname] of [['POST', '/api/turns'], ['POST', '/api/language'], ['POST', '/api/extensions/ash/install'], ['POST', '/api/extensions/ollama/settings'], ['POST', '/api/modes/r-1/decide'], ['POST', '/api/control/c-1/undo'], ['POST', '/api/intents/measure'], ['GET', '/api/ports']]) assert.ok(phonePolicy({ method, pathname }).allow, `${method} ${pathname}`);
  assert.ok(phonePolicy({ method: 'POST', pathname: '/api/settings', body: { room: { delegation: false } } }).allow);
  assert.ok(!phonePolicy({ method: 'POST', pathname: '/api/settings', body: { scopes: { claude: { maxMode: 4 } } } }).allow);
  assert.ok(!phonePolicy({ method: 'POST', pathname: '/api/settings', body: { override: { grace: { 3: 30 } } } }).allow);
  const send = (body) => phonePolicy({ method: 'POST', pathname: '/api/messages', body }).allow;
  assert.ok(send({ text: 'hello', mode: 2 }));
  assert.ok(send({ text: 'close issue#4 please' }), 'a # inside a word is not a mode');
  assert.ok(!send({ text: 'hello', mode: 3 }));
  assert.ok(!send({ text: 'deploy it #4' }));
  assert.ok(!send({ text: '#3 fix the bug' }));
});

test('phone · every module the room\'s page imports reaches the phone', async () => {
  // A module the bridge does not let through and app.js cannot load at all: the phone gets a page
  // that does nothing (2026-10-11: loader.js, review-ask.js and tour.js were missing). Followed
  // from app.js through every import, as the browser does.
  const seen = new Set();
  const walk = async (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');
    for (const [, name] of text.matchAll(/^import [^;]*? from '\.\/([\w.-]+\.js)';/gm)) await walk(name);
  };
  await walk('app.js');
  assert.ok(seen.size > 10, 'the imports of app.js were not read');
  for (const file of seen) assert.ok(phonePolicy({ method: 'GET', pathname: `/${file}` }).allow, `/${file} is imported by the room's page and the bridge refuses it`);
});

test('phone · cookies are read once each, and the bridge answers only to this Mac\'s own names', () => {
  assert.deepEqual(parseCookies('madre_phone=a%2Bb; madre_room=x; madre_phone=evil'), { madre_phone: 'a+b', madre_room: 'x' });
  const hosts = ownHosts(4316, { addresses: ['192.168.1.9'], name: 'MacBook-Air.local' });
  for (const host of ['192.168.1.9:4316', 'macbook-air.local:4316', '127.0.0.1:4316', 'localhost:4316']) assert.ok(hosts.has(host), host);
  assert.ok(!hosts.has('evil.example:4316'));
});

test('phone · where the person was is kept one per side, with the draft cut to size', async () => {
  const root = await scratch('madre-phone-handoff-');
  try {
    await writeHandoff(root, 'mac', { room: 'demo-0123456789abcdef', project: 'demo', port: 4317, chat: 'main', draft: 'x'.repeat(5000) }, { now: 10 });
    await writeHandoff(root, 'phone', { room: 'demo-0123456789abcdef', kind: 'iphone', anchor: 'msg-1' }, { now: 20 });
    const both = await readHandoff(root);
    assert.equal(both.mac.draft.length, 4000);
    assert.equal(both.phone.kind, 'iphone');
    assert.equal(both.mac.kind, null);
    assert.equal((await stat(join(root, 'handoff.json'))).mode & 0o777, 0o600);
    await assert.rejects(writeHandoff(root, 'tablet', {}));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('phone · the bridge: pair with a code, see the rooms, pick one, and act in it only as the policy allows', async () => {
  const root = await scratch('madre-phone-bridge-');
  const seen = [];
  const fakeRoom = http.createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      seen.push({ method: request.method, url: request.url, headers: request.headers, body: raw });
      // The list asks for the archive counted too: on a phone it is one line per room (docs/MACROVERSO.md).
      if (request.url === '/api/glance?census=1') return response.end(JSON.stringify({ project: 'demo', working: ['claude'], chats: 2, census: { memories: 3, kinds: { fact: 3 }, travelling: 3 } }));
      response.setHeader('content-type', 'application/json');
      response.setHeader('set-cookie', 'room_owned=1');
      response.end(JSON.stringify({ ok: true }));
    });
  });
  const roomPort = await listen(fakeRoom);
  await mkdir(join(root, 'rooms', 'demo-0123456789abcdef'), { recursive: true });
  await writeFile(join(root, 'rooms', 'demo-0123456789abcdef', 'open.json'), JSON.stringify({ pid: process.pid, port: roomPort, project: 'demo', version: '1.0.0' }));
  await mkdir(join(root, 'rooms', 'gone-0123456789abcdef'), { recursive: true });
  await writeFile(join(root, 'rooms', 'gone-0123456789abcdef', 'open.json'), JSON.stringify({ pid: 999_999_999, port: 1 }));
  let bridgePort = 0;
  const bridge = createBridge({ root, publicDirectory, hosts: () => new Set([`127.0.0.1:${bridgePort}`]) });
  bridgePort = await listen(bridge);
  const base = `http://127.0.0.1:${bridgePort}`;
  const same = { origin: base, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };
  try {
    assert.deepEqual((await roomsOnThisMac(root)).map((room) => room.id), ['demo-0123456789abcdef'], 'a room whose process is gone was listed');

    assert.equal((await fetch(`${base}/salas`)).status, 401);
    // fetch() will not send another host, so this one goes by hand.
    const foreign = await new Promise((resolve) => http.get({ host: '127.0.0.1', port: bridgePort, path: '/api/state', headers: { host: 'evil.example' } }, (answer) => { answer.resume(); resolve(answer.statusCode); }));
    assert.equal(foreign, 421);

    const invite = await createInvite(root);
    const paired = await fetch(`${base}/bridge/pair?c=${invite.code}`, { redirect: 'manual', headers: { 'user-agent': 'iPhone' } });
    assert.equal(paired.status, 303);
    assert.equal(paired.headers.get('location'), '/salas?listo=1');
    const phoneCookie = paired.headers.get('set-cookie').split(';')[0];
    assert.match(paired.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.equal((await fetch(`${base}/bridge/pair?c=${invite.code}`, { redirect: 'manual' })).status, 410);

    const rooms = await fetch(`${base}/bridge/rooms`, { headers: { cookie: phoneCookie } }).then((answer) => answer.json());
    assert.deepEqual(rooms.rooms.map((room) => [room.id, room.project, room.working[0], room.census.memories]), [['demo-0123456789abcdef', 'demo', 'claude', 3]]);
    assert.equal((await fetch(`${base}/`, { redirect: 'manual', headers: { cookie: phoneCookie } })).headers.get('location'), '/salas', 'with no room chosen the phone was not sent to the list');

    assert.equal((await fetch(`${base}/bridge/open`, { method: 'POST', headers: { cookie: phoneCookie, 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify({ room: 'demo-0123456789abcdef' }) })).status, 403, 'a page from elsewhere picked a room');
    const opened = await fetch(`${base}/bridge/open`, { method: 'POST', headers: { cookie: phoneCookie, ...same }, body: JSON.stringify({ room: 'demo-0123456789abcdef' }) });
    const both = `${phoneCookie}; ${opened.headers.get('set-cookie').split(';')[0]}`;

    seen.length = 0;
    const state = await fetch(`${base}/api/state`, { headers: { cookie: both, 'x-madre-device': 'forged' } });
    assert.equal(state.status, 200);
    assert.equal(state.headers.get('set-cookie'), null, 'a room set a cookie on the bridge\'s address');
    assert.equal(seen[0].headers.host, `127.0.0.1:${roomPort}`);
    assert.equal(seen[0].headers['x-madre-device'], rooms.device.id, 'the phone named itself');
    assert.equal(seen[0].headers['x-madre-device-kind'], 'iphone');
    assert.equal(seen[0].headers.cookie, undefined, 'the phone\'s cookies reached the room');

    seen.length = 0;
    const control = await fetch(`${base}/api/messages`, { method: 'POST', headers: { cookie: both, ...same }, body: JSON.stringify({ text: 'refactor', mode: 3 }) });
    assert.equal(control.status, 403);
    assert.equal((await fetch(`${base}/api/messages`, { method: 'POST', headers: { cookie: both, ...same }, body: JSON.stringify({ text: '#4 ship it' }) })).status, 403);
    assert.equal((await fetch(`${base}/api/settings`, { method: 'POST', headers: { cookie: both, ...same }, body: JSON.stringify({ scopes: { claude: { maxMode: 4 } } }) })).status, 403);
    assert.equal((await fetch(`${base}/api/tree/op`, { method: 'POST', headers: { cookie: both, ...same }, body: '{}' })).status, 403);
    assert.equal(seen.length, 0, 'a refused request reached the room');
    const create = await fetch(`${base}/api/messages`, { method: 'POST', headers: { cookie: both, ...same }, body: JSON.stringify({ text: 'add a test', mode: 2 }) });
    assert.equal(create.status, 200);
    assert.equal(seen[0].headers.origin, `http://127.0.0.1:${roomPort}`, 'the room saw the bridge\'s address as the origin');
    assert.equal(JSON.parse(seen[0].body).text, 'add a test');

    await forgetDevice(root, rooms.device.id);
    assert.equal((await fetch(`${base}/api/state`, { headers: { cookie: both } })).status, 401, 'a forgotten phone still got in');
  } finally {
    await close(bridge);
    await close(fakeRoom);
    await rm(root, { recursive: true, force: true });
  }
});

test('phone · the room: pairing is the Mac\'s, a phone asks up to #2, and what it writes says where it came from', async () => {
  const root = await scratch('madre-phone-room-');
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': async () => ({ text: 'done' }) } });
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  const phone = { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone', 'content-type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/api/phone`, { headers: phone })).status, 403);
    assert.equal((await fetch(`${base}/api/phone/invite`, { method: 'POST', headers: phone, body: '{}' })).status, 403);
    assert.equal((await fetch(`${base}/api/agents/codex/key`, { method: 'POST', headers: phone, body: JSON.stringify({ key: 'sk-x' }) })).status, 403, 'a key was taken through the bridge');
    assert.equal((await fetch(`${base}/api/settings`, { method: 'POST', headers: phone, body: JSON.stringify({ override: { grace: { 3: 30 } } }) })).status, 403, 'a phone changed the key of #3');
    assert.equal((await fetch(`${base}/api/settings`, { method: 'POST', headers: phone, body: JSON.stringify({ room: { delegation: true } }) })).status, 200);
    // Not in the public MADRE (2026-10-12): only a copy run from source can offer it at all — what
    // npm installs has no .git — and the pages hide it where it is not offered, «coming soon» included.
    const [serverCode, appCode, homeCode, pkg] = await Promise.all(['src/server.mjs', 'public/app.js', 'public/salas-mac.js', 'package.json'].map((file) => readFile(join(import.meta.dirname, '..', file), 'utf8')));
    assert.match(serverCode, /const FROM_SOURCE = existsSync\(new URL\('\.\.\/\.git', import\.meta\.url\)\);/);
    assert.match(serverCode, /const phonePreview = async \(\) => FROM_SOURCE && \(/);
    assert.ok(!JSON.parse(pkg).files.some((entry) => entry.includes('.git')), 'the package would carry a .git');
    assert.match(appCode, /hidden: \(\) => \(state\.phonePreview \? \[\] : \['phone'\]\)/);
    assert.match(homeCode, /hidden: \(\) => \(data\?\.phonePreview \? \[\] : \['phone'\]\)/);
    assert.match(appCode, /function drawPhones\(host\) \{\n  if \(state\.device\) return;\n  if \(!state\.phonePreview\) return;/);
    // A preview in MADRE 1.0: until this Mac turns it on, nothing about the phone is offered, no
    // code is made, and the page is told so.
    assert.deepEqual(await fetch(`${base}/api/phone`).then((answer) => answer.json()), { preview: false });
    assert.equal((await fetch(`${base}/api/phone/invite`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{}' })).status, 404, 'a code was made with the phone off');
    assert.equal((await fetch(`${base}/api/state`).then((answer) => answer.json())).phonePreview, false);
    await updateConfig(root, { phone: { preview: true } });
    assert.equal((await fetch(`${base}/api/state`).then((answer) => answer.json())).phonePreview, true);
    const mac = await fetch(`${base}/api/phone`).then((answer) => answer.json());
    assert.equal(mac.preview, true);
    assert.equal(typeof mac.available, 'boolean');
    assert.ok(Array.isArray(mac.devices));

    assert.equal((await fetch(`${base}/api/state`, { headers: phone }).then((answer) => answer.json())).device.kind, 'iphone');
    assert.equal((await fetch(`${base}/api/state`).then((answer) => answer.json())).device, null);

    assert.equal((await fetch(`${base}/api/messages`, { method: 'POST', headers: phone, body: JSON.stringify({ text: 'fix it', target: 'codex', mode: 3 }) })).status, 403);
    assert.equal((await fetch(`${base}/api/messages`, { method: 'POST', headers: phone, body: JSON.stringify({ text: 'hello from the bus', target: 'codex' }) })).status, 202);
    assert.equal((await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello from the desk', target: 'codex', via: 'iphone' }) })).status, 202);
    let said = [];
    for (let attempt = 0; attempt < 40 && said.length < 2; attempt += 1) {
      said = (await store.readAll()).filter((event) => event.type === 'message.created' && event.payload.role === 'user');
      if (said.length < 2) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(said.find((event) => event.payload.text === 'hello from the bus').payload.via, 'iphone');
    assert.equal(said.find((event) => event.payload.text === 'hello from the desk').payload.via, undefined, 'the body named where a message came from');

    const glance = await fetch(`${base}/api/glance`, { headers: phone }).then((answer) => answer.json());
    assert.equal(typeof glance.project, 'string');
    assert.ok(Array.isArray(glance.working));

    assert.equal((await fetch(`${base}/api/handoff`, { method: 'POST', headers: phone, body: JSON.stringify({ draft: 'half a thought', anchor: 'msg-9' }) })).status, 200);
    const where = await fetch(`${base}/api/handoff`).then((answer) => answer.json());
    assert.equal(where.phone.draft, 'half a thought');
    assert.equal(where.phone.kind, 'iphone');

    // A phone starts or opens a conversation by its address; the one open on the Mac stays open.
    const open = async () => (await fetch(`${base}/api/chats`).then((answer) => answer.json())).active;
    const before = await open();
    const made = await fetch(`${base}/api/chats`, { method: 'POST', headers: phone, body: '{}' }).then((answer) => answer.json());
    assert.ok(made.opened && made.opened !== before);
    assert.equal(await open(), before, 'a conversation started on the phone moved the Mac\'s');
    await fetch(`${base}/api/chats/${made.opened}`, { method: 'POST', headers: phone, body: '{}' });
    assert.equal(await open(), before, 'a conversation opened on the phone moved the Mac\'s');
    const seen = await fetch(`${base}/api/state?chat=${made.opened}`, { headers: phone }).then((answer) => answer.json());
    assert.equal(seen.chat, made.opened, 'the phone cannot read the conversation it started');
  } finally {
    await close(server);
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('phone · what waits for the human: a choice an agent offered, until the human speaks again', async () => {
  const root = await scratch('madre-phone-waiting-');
  const agents = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  let reply = 'Here is what I would do.\n\n```pulse-ask\nWhere should the export live?\n- In the project (recommended)\n- Beside the room log\n- Somewhere you name\n```';
  const { server, store } = await createPulseServer({ projectRoot: root, stateRoot: root, agents, invokers: { 'codex-readonly': async () => ({ text: reply }) } });
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  const phone = { 'x-madre-device': 'd1', 'x-madre-device-kind': 'iphone', 'content-type': 'application/json' };
  const settle = async (want) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const events = await store.readAll();
      if (want(events)) return events;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return store.readAll();
  };
  try {
    // Choices are a module: switched on, the way the Mac does it.
    await fetch(`${base}/api/extensions/choices/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: true }) });
    const glance = () => fetch(`${base}/api/glance`, { headers: phone }).then((answer) => answer.json());
    assert.equal((await glance()).waitingCount, 0);
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'where should the export go?', target: 'codex' }) });
    const events = await settle((all) => all.some((event) => event.type === 'choice.offered'));
    assert.ok(events.some((event) => event.type === 'choice.offered'), 'the agent never offered a choice');
    const waiting = await glance();
    assert.equal(waiting.waitingCount, 1);
    assert.deepEqual([waiting.waiting[0].kind, waiting.waiting[0].agent, waiting.waiting[0].text], ['choice', 'codex', 'Where should the export live?']);
    assert.equal(typeof waiting.waiting[0].chat, 'string', 'the phone cannot open the conversation that waits');
    reply = 'Done: it lives in the project.';
    await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'In the project', target: 'codex' }) });
    await settle((all) => all.filter((event) => event.type === 'message.created' && event.payload.role !== 'user').length >= 2);
    assert.equal((await glance()).waitingCount, 0, 'an answered choice still waits');
  } finally {
    await close(server);
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('phone · the page on a phone: nothing spills past the screen, nothing floats over the conversation, and the keyboard is followed', async () => {
  const [app, css] = await Promise.all([readFile(new URL('../public/app.js', import.meta.url), 'utf8'), readFile(new URL('../public/styles.css', import.meta.url), 'utf8')]);
  // The strip under the conversation is the box and its lift, wherever the page has scrolled.
  assert.match(app, /Math\.ceil\(pageScrolls\(\) \? box\.height \+ lift : shell\.getBoundingClientRect\(\)\.bottom - box\.top\)/);
  // The keyboard is followed from the viewports alone: the box on the visible bottom, the bar from the visible top.
  assert.match(app, /\(root\.clientHeight \|\| window\.innerHeight\) - view\.offsetTop - view\.height/);
  assert.match(app, /root\.style\.setProperty\('--vv-top', `\$\{top\}px`\)/);
  assert.match(css, /\.via-phone \.shell > \.bar \{ position: fixed; top: calc\(env\(safe-area-inset-top\) \+ 8px \+ var\(--vv-top, 0px\)\);/);
  // The conversations are a key in the bar, and it does not travel.
  assert.match(app, /key\.classList\.add\('mother-button'\); key\.hidden = false; left\.after\(key\);/);
  assert.match(app, /if \(event\.button !== 0 \|\| state\.device \|\| button\.closest\?\.\('\.bar'\)\) return;/);
  // No row slides sideways under a thumb: the chips fit, and a message is never wider than the screen.
  assert.match(css, /\.via-phone \.composer > \.pick-options \{ overflow: hidden;/);
  assert.doesNotMatch(css, /\.via-phone \.composer > \.pick-options \{ overflow-x: auto/);
  assert.match(css, /\.via-phone \.row \{ grid-template-columns: 28px minmax\(0, 1fr\); \}/);
  assert.match(css, /\.via-phone \.who \.spent \{ display: none; \}/);
  // A touch does only what it touched, and nothing scrolls behind a sheet.
  assert.match(css, /html\.via-phone \{ touch-action: manipulation; -webkit-tap-highlight-color: transparent; \}/);
  assert.match(css, /html\.via-phone\.sheet-up \{ overflow: hidden; \}/);
});
