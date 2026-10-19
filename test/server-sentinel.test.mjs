import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerSentinel } from '../src/server-sentinel.mjs';

const header = 'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME';
const line = (command, pid, address) => `${command} ${pid} me 20u IPv4 0x1 0t0 TCP ${address} (LISTEN)`;

function machine() {
  const world = {
    listening: [line('node', 4399, '127.0.0.1:5173'), line('python3', 9294, '127.0.0.1:8000'), line('node', 5100, '*:3000')],
    cwds: { 4399: '/Users/x/gumball/packages/web', 9294: '/Users/x/other', 5100: '/Users/x/gumball' },
    http: new Set([5173, 8000]),
    said: [],
  };
  const sentinel = new ServerSentinel({
    projectRoot: '/Users/x/gumball',
    listen: async () => [header, ...world.listening].join('\n'),
    cwdsOf: async (pids) => pids.filter((pid) => world.cwds[pid]).map((pid) => `p${pid}\nfcwd\nn${world.cwds[pid]}`).join('\n'),
    probe: async (port) => (world.http.has(port) ? { ok: true, status: 200, html: true, contentType: 'text/html', framable: true } : { ok: false }),
    emit: (type, payload) => world.said.push({ type, payload }),
  });
  return { world, sentinel };
}

test('servers: only what this project started is shown, open to the network or not, and the rest is only counted', async () => {
  const { world, sentinel } = machine();
  world.http.add(3000);
  const read = await sentinel.scan();
  // Another folder's server answers HTTP on loopback and is still not this project's.
  // The project's own server bound to every interface is offered too (2026-10-18), opened on
  // 127.0.0.1 and marked as reachable from the network.
  assert.deepEqual(read.ports.map((one) => one.port), [3000, 5173]);
  assert.ok(read.ports.every((one) => one.here));
  assert.deepEqual(read.ports.map((one) => Boolean(one.network)), [true, false]);
  assert.deepEqual(read.wider, []);
  assert.equal(read.others, 1);
});

test('servers: the sentinel says what came up and what went down, and the first reading is not news', async () => {
  const { world, sentinel } = machine();
  await sentinel.scan();
  assert.deepEqual(world.said.map((one) => one.type), ['servers.changed'], 'a page opening is not a server starting');

  world.said.length = 0;
  await sentinel.scan();
  assert.deepEqual(world.said, [], 'nothing changed, so nothing is said');

  world.listening = world.listening.filter((one) => !one.includes(':5173'));
  await sentinel.scan();
  assert.deepEqual(world.said.map((one) => one.type), ['server.stopped', 'servers.changed']);
  assert.deepEqual(world.said[0].payload, { port: 5173, command: 'node' });

  world.said.length = 0;
  world.listening.push(line('node', 4500, '127.0.0.1:5173'));
  world.cwds[4500] = '/Users/x/gumball';
  await sentinel.scan();
  assert.deepEqual(world.said.map((one) => one.type), ['server.started', 'servers.changed']);
});

test('servers: a port that does not speak HTTP is asked once, not on every watch', async () => {
  const { world } = machine();
  let asked = 0;
  world.listening.push(line('postgres', 7000, '127.0.0.1:5432'));
  world.cwds[7000] = '/Users/x/gumball';
  const counting = new ServerSentinel({
    projectRoot: '/Users/x/gumball',
    listen: async () => [header, ...world.listening].join('\n'),
    cwdsOf: async (pids) => pids.filter((pid) => world.cwds[pid]).map((pid) => `p${pid}\nfcwd\nn${world.cwds[pid]}`).join('\n'),
    probe: async (port) => { if (port === 5432) asked += 1; return world.http.has(port) ? { ok: true, status: 200, html: true, framable: true } : { ok: false }; },
  });
  await counting.scan();
  await counting.scan();
  await counting.scan();
  assert.equal(asked, 1);
});

test('servers: one reading at a time, and a broken lsof is "not read", never "nothing here"', async () => {
  const { sentinel } = machine();
  const [a, b] = await Promise.all([sentinel.scan(), sentinel.scan()]);
  assert.deepEqual(a, b);
  const broken = new ServerSentinel({ projectRoot: '/p', listen: async () => { throw new Error('lsof missing'); }, cwdsOf: async () => '', probe: async () => ({ ok: false }) });
  assert.equal((await broken.scan()).probed, false);
});

test('servers: a MADRE room started in the project is the room, not the project\'s server', async () => {
  const { world } = machine();
  world.listening.push(line('node', 6100, '127.0.0.1:4401'));
  world.cwds[6100] = '/Users/x/gumball';
  world.http.add(4401);
  const sentinel = new ServerSentinel({
    projectRoot: '/Users/x/gumball',
    listen: async () => [header, ...world.listening].join('\n'),
    cwdsOf: async (pids) => pids.filter((pid) => world.cwds[pid]).map((pid) => `p${pid}\nfcwd\nn${world.cwds[pid]}`).join('\n'),
    probe: async (port) => (world.http.has(port) ? { ok: true, status: 200, html: true, framable: true } : { ok: false }),
    isRoom: async (port) => port === 4401,
  });
  assert.deepEqual((await sentinel.scan()).ports.map((one) => one.port), [5173]);
  const { classifyListening } = await import('../src/ports.mjs');
  assert.deepEqual(classifyListening([header, line('ollama', 1, '127.0.0.1:11434')].join('\n')).ports, [], 'the local model MADRE uses is not a project server');
  assert.deepEqual(classifyListening([header, line('llama-ser', 2, '127.0.0.1:53328')].join('\n')).ports, [], 'nor the runner Ollama opens for each model it loads');
});
