import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cleanServer, keepSecrets, writeMcp, readMcp, codexServers, importable, mcpFile } from '../src/mcp/connect.mjs';
import { checkServer, serverForTurn, proxyArgs, PROXY } from '../src/modules/mcp-connect.mjs';
import { toolsForTurn } from '../src/modules/index.mjs';

// A tiny MCP server over stdio: two tools, one that only reads. It prints its environment's
// SECRET_KEY back from `whoami`, so a test can see the secret arrived without it being in argv.
const FAKE = `
let buffer = '';
const write = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  for (let at = buffer.indexOf('\\n'); at >= 0; at = buffer.indexOf('\\n')) {
    const line = buffer.slice(0, at); buffer = buffer.slice(at + 1);
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.method === 'initialize') write({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1.2.3' } } });
    else if (message.method === 'tools/list') write({ jsonrpc: '2.0', id: message.id, result: { tools: [
      { name: 'whoami', description: 'Says the key.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object' } },
      { name: 'send_mail', description: 'Sends a mail.', inputSchema: { type: 'object' } },
    ] } });
    else if (message.method === 'tools/call') write({ jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: message.params.name + ':' + (process.env.SECRET_KEY ?? '') }] } });
  }
});
`;

function talk(args, messages, { ms = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const answers = [];
    let out = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('no answer')); }, ms);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      out += chunk;
      for (let at = out.indexOf('\n'); at >= 0; at = out.indexOf('\n')) {
        const line = out.slice(0, at); out = out.slice(at + 1);
        if (line.trim()) answers.push(JSON.parse(line));
        if (answers.filter((one) => one.id !== undefined).length >= messages.filter((one) => one.id !== undefined).length) { clearTimeout(timer); child.stdin.end(); child.kill(); resolve(answers); }
      }
    });
    for (const message of messages) child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

async function project() {
  const root = await mkdtemp(join(tmpdir(), 'madre-mcp-'));
  const state = join(root, 'state');
  const proj = join(root, 'proj');
  await mkdir(state, { recursive: true });
  await mkdir(proj, { recursive: true });
  const fake = join(root, 'fake-server.mjs');
  await writeFile(fake, FAKE);
  return { root, state, proj, fake };
}

test('mcp: a command server is checked before any turn gets it, and its secret never sits in argv or in the list', async () => {
  const { root, state, proj, fake } = await project();
  try {
    const made = cleanServer({ id: 'fake', label: 'Fake', transport: 'stdio', command: `${process.execPath} ${fake}`, env: [{ name: 'SECRET_KEY', value: 's3cr3t-value', secret: true }, { name: 'MODE', value: 'demo' }] });
    assert.equal(made.error, undefined);
    assert.equal((await keepSecrets(state, made.secrets)).ok, true);
    await writeMcp(state, proj, { servers: [made.server] });
    assert.doesNotMatch(await readFile(mcpFile(state, proj), 'utf8'), /s3cr3t-value/, 'a secret was written to the list');

    const check = await checkServer({ stateRoot: state, projectRoot: proj, id: 'fake' });
    assert.equal(check.ok, true, check.problem);
    assert.deepEqual(check.tools.map((tool) => [tool.name, tool.readOnly]), [['whoami', true], ['send_mail', false]]);
    assert.deepEqual(check.server, { name: 'fake', version: '1.2.3' });

    // Through the proxy, as a CLI would: the secret arrives in the server's environment.
    const args = proxyArgs({ stateRoot: state, projectRoot: proj, id: 'fake', allow: ['whoami'] });
    assert.ok(!args.join(' ').includes('s3cr3t-value'), 'a secret is in the argv');
    const answers = await talk(args, [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'whoami', arguments: {} } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'send_mail', arguments: {} } },
    ]);
    const by = (id) => answers.find((one) => one.id === id);
    assert.deepEqual(by(2).result.tools.map((tool) => tool.name), ['whoami'], 'a tool outside --allow was listed');
    assert.equal(by(3).result.content[0].text, 'whoami:s3cr3t-value');
    assert.equal(by(4).result.isError, true, 'a tool outside --allow reached the server');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('mcp: tools that read work from #1, tools that act only from the mode chosen; nothing for a ghost or an unchecked server', () => {
  const server = { id: 'fake', label: 'Fake', enabled: true, problem: null, actions: 4, agents: null, tools: [{ name: 'whoami', readOnly: true }, { name: 'send_mail', readOnly: false }] };
  const at = (mode, extra = {}) => serverForTurn({ ...server, ...extra }, { stateRoot: '/s', projectRoot: '/p', agent: 'codex', mode });
  assert.equal(at(0), null);
  assert.deepEqual(at(1).tools, ['whoami']);
  assert.deepEqual(at(3).tools, ['whoami']);
  assert.deepEqual(at(4).tools, ['whoami', 'send_mail']);
  assert.deepEqual(at(4).sends, ['send_mail'], 'acting tools at #4 are not declared as sending to the core');
  assert.deepEqual(at(3, { actions: 3 }).tools, ['whoami', 'send_mail']);
  assert.deepEqual(at(3, { actions: 3 }).sends, []);
  assert.equal(at(2, { problem: 'it did not answer' }), null);
  assert.equal(at(2, { enabled: false }), null);
  assert.equal(at(2, { tools: [] }), null);
  assert.equal(serverForTurn({ ...server, agents: ['claude'] }, { stateRoot: '/s', projectRoot: '/p', agent: 'codex', mode: 2 }), null);
  assert.equal(at(1).command, process.execPath);
  assert.equal(at(1).args[0], PROXY);
});

test('mcp: a name MADRE uses, a shell line or a plain-http remote is refused with the reason', () => {
  assert.match(cleanServer({ id: 'pulse-memory', command: 'x' }).error, /belongs to MADRE/);
  assert.match(cleanServer({ id: 'Bad Name', command: 'x' }).error, /lowercase/);
  assert.equal(cleanServer({ id: 'one', command: 'node a.mjs | tee log' }).errorArgs.why, 'uses "{char}", which needs a shell; put each command on its own line');
  assert.match(cleanServer({ id: 'one', transport: 'http', url: 'http://example.com/mcp' }).error, /https/);
  assert.equal(cleanServer({ id: 'one', transport: 'http', url: 'http://127.0.0.1:9/mcp' }).error, undefined);
  assert.match(cleanServer({ id: 'one', command: 'x' }, { existing: [{ id: 'one' }] }).error, /already/);
  const token = cleanServer({ id: 'apex', transport: 'http', url: 'https://apex.example/mcp', auth: 'token', token: 'Bearer abc123' });
  assert.deepEqual(token.secrets, [{ name: 'apex_token', value: 'abc123' }]);
  const header = cleanServer({ id: 'h', transport: 'http', url: 'https://h.example/mcp', headers: [{ name: 'X-Api-Key', value: 'Key k-1', secret: true }] });
  assert.deepEqual(header.server.headers, [{ name: 'X-Api-Key', prefix: 'Key ', secret: true }]);
  assert.deepEqual(header.secrets, [{ name: 'h_hdr_X-Api-Key', value: 'k-1' }]);
});

test('mcp: a remote server over Streamable HTTP, with its token from the vault; a refused token is said as such', async () => {
  const { root, state, proj } = await project();
  const http = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    if (request.headers.authorization !== 'Bearer good-token') { response.writeHead(401, { 'www-authenticate': 'Bearer' }); response.end('{}'); return; }
    const message = JSON.parse(body);
    if (message.id === undefined) { response.writeHead(202); response.end(); return; }
    const result = message.method === 'initialize'
      ? { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'remote', version: '9' } }
      : message.method === 'tools/list' ? { tools: [{ name: 'apex_status', annotations: { readOnlyHint: true } }] } : { content: [{ type: 'text', text: 'ok' }] };
    response.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 'abc' });
    response.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n\n`);
  });
  await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${http.address().port}/mcp`;
    for (const [id, token] of [['good', 'good-token'], ['bad', 'nope']]) {
      const made = cleanServer({ id, transport: 'http', url, auth: 'token', token });
      await keepSecrets(state, made.secrets);
      const { servers } = await readMcp(state, proj);
      await writeMcp(state, proj, { servers: [...servers, made.server] });
    }
    const good = await checkServer({ stateRoot: state, projectRoot: proj, id: 'good' });
    assert.equal(good.ok, true, good.problem);
    assert.deepEqual(good.tools, [{ name: 'apex_status', readOnly: true, description: '' }]);
    const bad = await checkServer({ stateRoot: state, projectRoot: proj, id: 'bad' });
    assert.equal(bad.ok, false);
    assert.equal(bad.needsAuth, true);
    assert.match(bad.problem, /refused the credentials/);
  } finally {
    http.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('mcp: a server that keeps its event stream open after answering is still checked (DeepWiki, 2026-10-20)', async () => {
  const { root, state, proj } = await project();
  const open = new Set();
  const http = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const message = JSON.parse(body);
    if (message.id === undefined) { response.writeHead(202); response.end(); return; }
    const result = message.method === 'initialize'
      ? { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'open-stream', version: '1' } }
      : { tools: [{ name: 'ask_wiki_question', annotations: { readOnlyHint: true } }] };
    // The answer, and then the stream is left open: never ended by the server.
    response.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 'kept' });
    response.write(`event: message\r\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\r\n\r\n`);
    open.add(response);
  });
  await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
  try {
    const made = cleanServer({ id: 'wiki', transport: 'http', url: `http://127.0.0.1:${http.address().port}/mcp` });
    await writeMcp(state, proj, { servers: [made.server] });
    const checked = await checkServer({ stateRoot: state, projectRoot: proj, id: 'wiki', timeoutMs: 8000 });
    assert.equal(checked.ok, true, checked.problem);
    assert.deepEqual(checked.tools.map((tool) => tool.name), ['ask_wiki_question']);
  } finally {
    for (const response of open) response.destroy();
    http.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('mcp: servers already set up in other apps are found by name, values unread until imported', async () => {
  const { root, proj } = await project();
  const home = join(root, 'home');
  try {
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(join(home, '.codex', 'config.toml'), [
      'model = "x"', '', '[mcp_servers.node_repl]', 'args = []', 'command = "/bin/node_repl"', '', '[mcp_servers.node_repl.env]', 'TOKEN = "t-1"', '',
      '[mcp_servers.docs]', 'url = "https://developers.example/mcp"', '', '[memories]', 'use = true',
    ].join('\n'));
    await writeFile(join(proj, '.mcp.json'), JSON.stringify({ mcpServers: { ahp: { type: 'stdio', command: 'npx', args: ['--no-install', 'ahp', 'live', 'serve', '.'] } } }));
    await writeFile(join(proj, 'opencode.json'), JSON.stringify({ mcp: { apex: { type: 'remote', url: 'https://apex.example/mcp', oauth: {} } } }));
    const found = await importable({ projectRoot: proj, home });
    assert.deepEqual(found.map((one) => [one.source, one.id, one.transport]), [
      ['.mcp.json (this project)', 'ahp', 'stdio'], ['opencode.json (this project)', 'apex', 'http'], ['Codex', 'node-repl', 'stdio'], ['Codex', 'docs', 'http'],
    ]);
    assert.deepEqual(codexServers('[mcp_servers.a]\ncommand = "x"\nargs = ["--y", "z"]\n[mcp_servers.a.env]\nK = "v"\n')[0], { source: 'Codex', name: 'a', url: null, command: ['x', '--y', 'z'], env: { K: 'v' }, headers: {}, disabled: false });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('mcp: the module hands a checked server to a turn of the project, through the core\'s rule for tools that act', async () => {
  const { root, state, proj, fake } = await project();
  try {
    const made = cleanServer({ id: 'fake', transport: 'stdio', command: `${process.execPath} ${fake}` });
    await writeMcp(state, proj, { servers: [{ ...made.server, tools: [{ name: 'whoami', readOnly: true }, { name: 'send_mail', readOnly: false }] }] });
    const ctx = { stateRoot: state, projectRoot: proj, config: {}, env: process.env };
    const at = async (mode) => (await toolsForTurn(ctx, { agent: 'codex', mode })).find((one) => one.name === 'fake');
    assert.deepEqual((await at(1)).tools, ['whoami']);
    assert.deepEqual((await at(4)).tools, ['whoami', 'send_mail']);
    assert.equal(await at(0), undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
