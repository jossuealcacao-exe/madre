// CORREO, the first connector: what leaves this machine, and everything that has to be true
// before it can. The SMTP dialogue is driven against a fake socket so the protocol is actually
// exercised — a mock of `sendMail` would only test that the arguments were spelled right.

import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildMessage, dotStuff, encodeHeader, headerSafe, sendMail, validAddress } from '../src/smtp.mjs';
import { REACHES, TOOL, allowed, handleRequest, parseAllow, reachesFor, send } from '../src/mcp/smtp-server.mjs';
import correo from '../src/modules/correo.mjs';
import { clearDeclaredDestinations, classify, declareDestinations } from '../src/outbound.mjs';
import { writeSecret } from '../src/vault.mjs';

// CORREO lives in the lab until it is finished: the registry offers it only when asked by name.
process.env.PULSE_LABS = 'correo';
const { toolsForTurn } = await import('../src/modules/index.mjs');

// A socket that speaks SMTP back. `script` is what the server says, in order; an entry may be an
// ARRAY, which is the same reply arriving in several chunks — which is what a real socket does and
// where the only subtlety of this protocol lives. Everything the client writes is kept, in order,
// so the test can read the whole conversation afterwards.
function fakeSocket(script) {
  const socket = new EventEmitter();
  const said = [];
  let step = 0;
  const answer = () => {
    if (step >= script.length) return;
    const chunks = Array.isArray(script[step]) ? script[step] : [script[step]];
    step += 1;
    for (const chunk of chunks) queueMicrotask(() => socket.emit('data', chunk));
  };
  socket.setEncoding = () => socket;
  socket.setTimeout = () => socket;
  socket.write = (text) => { said.push(text); answer(); return true; };
  socket.end = () => { socket.ended = true; };
  socket.destroy = () => { socket.destroyed = true; };
  socket.said = said;
  socket.greet = answer;
  return socket;
}

const OK = [
  '220 smtp.gmail.com ESMTP ready\r\n',
  // EHLO answers over several lines, and a real socket hands them over in whatever chunks TCP
  // felt like — here split in the middle of a line, which is the case that matters.
  ['250-smtp.gmail.com at your service\r\n250-SIZE 358', '82577\r\n250 SMTPUTF8\r\n'],
  '334 VXNlcm5hbWU6\r\n',
  '334 UGFzc3dvcmQ6\r\n',
  '235 2.7.0 Accepted\r\n',
  '250 2.1.0 OK\r\n',
  '250 2.1.5 OK\r\n',
  '354 Go ahead\r\n',
  '250 2.0.0 OK 1727000000 x1-2024\r\n',
];

test('smtp: the whole dialogue, including a multi-line reply', async () => {
  const socket = fakeSocket(OK);
  const promise = sendMail({
    user: 'her@gmail.com', password: 'abcd efgh', from: 'her@gmail.com', fromName: 'Jossué',
    to: 'otra@example.com', subject: 'Niños, mañana', body: 'Hola.\nSaludos.',
    connectImpl: () => socket,
  });
  socket.greet();                                   // the greeting arrives before anything is said
  const result = await promise;

  const conversation = socket.said.join('');
  // The whole dialogue, in order. A reply read as finished too early — at `250-SIZE`, or at a
  // chunk that split mid-line — puts every step after it one behind, and this is where that shows.
  assert.deepEqual(socket.said.slice(0, 8).map((one) => one.split('\r\n')[0]), [
    'EHLO gmail.com',
    'AUTH LOGIN',
    Buffer.from('her@gmail.com').toString('base64'),
    Buffer.from('abcd efgh').toString('base64'),
    'MAIL FROM:<her@gmail.com>',
    'RCPT TO:<otra@example.com>',
    'DATA',
    'From: =?UTF-8?B?Sm9zc3XDqQ==?= <her@gmail.com>',
  ]);
  assert.ok(conversation.includes(`${Buffer.from('her@gmail.com').toString('base64')}\r\n`), 'the user did not travel base64');
  assert.ok(conversation.includes(`${Buffer.from('abcd efgh').toString('base64')}\r\n`), 'the password did not travel base64');
  assert.ok(!conversation.includes('abcd efgh'), 'the password travelled in the clear');
  assert.match(conversation, /MAIL FROM:<her@gmail\.com>/);
  assert.match(conversation, /RCPT TO:<otra@example\.com>/);
  assert.match(conversation, /\r\n\.\r\n|\r\n\.$/, 'the message was not ended with a lone dot');
  assert.match(conversation, /QUIT\r\n/);
  assert.deepEqual(result.to, ['otra@example.com']);
  assert.equal(result.ok, true);
});

test('smtp: a refusal names the step it failed at, and nothing is left open', async () => {
  const socket = fakeSocket([OK[0], OK[1], OK[2], OK[3], '535 5.7.8 Username and Password not accepted\r\n']);
  const promise = sendMail({ password: 'wrong', from: 'her@gmail.com', to: 'otra@example.com', subject: 's', body: 'b', connectImpl: () => socket });
  socket.greet();
  const error = await promise.then(() => null, (one) => one);
  assert.ok(error, 'a rejected password was reported as sent');
  assert.equal(error.code, 'SMTP_535');
  assert.equal(error.step, 'password');
  assert.match(error.message, /refused at password/);
  assert.equal(socket.destroyed, true, 'the socket was left open after a refusal');
});

test('smtp: a header cannot carry a second recipient', () => {
  // Header injection: a newline in a subject or an address is how a message quietly acquires
  // recipients nobody typed. Both are refused rather than escaped.
  assert.equal(validAddress('otra@example.com'), true);
  assert.equal(validAddress('otra@example.com\nBcc: alguien@example.com'), false);
  assert.equal(validAddress('otra@example.com, otro@example.com'), false);
  assert.equal(validAddress('no-arroba'), false);
  assert.equal(headerSafe('Hola\r\nBcc: alguien@example.com'), 'Hola Bcc: alguien@example.com');

  const message = buildMessage({ from: 'her@gmail.com', to: ['otra@example.com'], subject: 'Mañana\r\nBcc: x@y.com', body: 'hola', date: new Date('2026-10-02T12:00:00Z') });
  assert.equal(message.split('\r\n').filter((line) => /^Bcc:/i.test(line)).length, 0, 'an injected Bcc became a header');
  // Non-ASCII survives the trip instead of arriving as mojibake.
  assert.match(message, /^Subject: =\?UTF-8\?B\?/m);
  assert.equal(encodeHeader('Mañana'), `=?UTF-8?B?${Buffer.from('Mañana', 'utf8').toString('base64')}?=`);
  assert.equal(encodeHeader('Tomorrow'), 'Tomorrow');
  // A line that begins with a dot would end the message where it stands.
  assert.equal(dotStuff('uno\n.dos\ntres'), 'uno\r\n..dos\r\ntres');
});

test('correo: the allowlist is a floor under a mistake, and it is kept in the server', async () => {
  assert.deepEqual(parseAllow(' A@b.com , @equipo.mx '), ['a@b.com', '@equipo.mx']);
  assert.equal(allowed('a@b.com', ['a@b.com']), true);
  assert.equal(allowed('otro@equipo.mx', ['@equipo.mx']), true);
  assert.equal(allowed('otro@fuera.com', ['@equipo.mx']), false);
  assert.equal(allowed('cualquiera@fuera.com', []), true, 'an empty list means anyone, on purpose');

  const env = { PULSE_SMTP_FROM: 'her@gmail.com', PULSE_SMTP_ALLOW: '@equipo.mx', PULSE_SMTP_FAKE: '1' };
  let sent = false;
  const error = await send({ to: 'extraño@fuera.com', subject: 's', body: 'b', env, send: async () => { sent = true; return {}; } })
    .then(() => null, (one) => one);
  assert.ok(error, 'a recipient outside the list was written to');
  assert.equal(error.code, 'NOT_ALLOWED');
  assert.equal(sent, false);
});

test('correo: the tool refuses before it sends, and says so without claiming it went', async () => {
  const env = { PULSE_SMTP_FROM: 'her@gmail.com', PULSE_SMTP_FAKE: '1' };
  for (const [args, code] of [
    [{ to: '', subject: 's', body: 'b' }, 'NO_RECIPIENT'],
    [{ to: 'a@b.com', subject: '  ', body: 'b' }, 'NO_SUBJECT'],
    [{ to: 'a@b.com', subject: 's', body: '' }, 'NO_BODY'],
  ]) {
    const error = await send({ ...args, env }).then(() => null, (one) => one);
    assert.equal(error?.code, code);
  }
  const unset = await send({ to: 'a@b.com', subject: 's', body: 'b', env: {} }).then(() => null, (one) => one);
  assert.equal(unset?.code, 'NO_FROM');

  // And through JSON-RPC: a failure comes back as an error RESULT, not as a sentence that reads
  // like success. `isError` is the only thing a model has to tell them apart.
  const answer = await handleRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'send_email', arguments: { to: 'a@b.com', subject: '', body: 'b' } } }, { env });
  assert.equal(answer.result.isError, true);
  assert.match(answer.result.content[0].text, /^Nothing was sent/);

  const listed = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { env });
  assert.deepEqual(listed.result.tools.map((one) => one.name), ['send_email']);
  assert.match(TOOL.description, /cannot be undone/);
});

test('correo: what left is in the log, and what was in it is not', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-correo-'));
  try {
    const log = join(dir, 'outbound.jsonl');
    const fake = join(dir, 'sent.jsonl');
    const env = {
      PULSE_SMTP_FROM: 'her@gmail.com', PULSE_SMTP_HOST: 'smtp.gmail.com',
      PULSE_SMTP_FAKE: '1', PULSE_SMTP_FAKE_FILE: fake, PULSE_OUTBOUND_LOG: log,
    };
    clearDeclaredDestinations();
    const result = await send({ to: 'otra@example.com', subject: 'Cotización', body: 'Va adjunto.', env });
    assert.deepEqual(result.to, ['otra@example.com']);

    await new Promise((resolve) => setTimeout(resolve, 60));
    const line = JSON.parse((await readFile(log, 'utf8')).trim().split('\n').pop());
    assert.equal(line.id, 'correo:smtp', 'the send was logged as an address nothing declares');
    assert.equal(line.ok, true);
    assert.equal(line.method, 'SMTP');
    const text = JSON.stringify(line);
    assert.ok(!text.includes('otra@example.com'), 'a recipient reached the log');
    assert.ok(!text.includes('Cotización'), 'a subject reached the log');
    assert.ok(!text.includes('Va adjunto'), 'the body reached the log');
  } finally {
    clearDeclaredDestinations();
    await rm(dir, { recursive: true, force: true });
  }
});

test('correo: the destination is declared, and follows the host it is pointed at', () => {
  clearDeclaredDestinations();
  try {
    assert.equal(classify('smtps://smtp.gmail.com:465/').id, 'unknown', 'undeclared, it is said to be exactly that');
    declareDestinations('correo', REACHES);
    const gmail = classify('smtps://smtp.gmail.com:465/');
    assert.equal(gmail.id, 'correo:smtp');
    assert.equal(gmail.module, 'correo', 'who vouched for the address is part of the promise');

    // Pointing CORREO elsewhere replaces the entry rather than adding a second one: the log must
    // not keep vouching for a server this module stopped talking to.
    declareDestinations('correo', reachesFor('smtp.fastmail.com'));
    assert.equal(classify('smtps://smtp.fastmail.com:465/').id, 'correo:smtp');
    assert.equal(classify('smtps://smtp.gmail.com:465/').id, 'unknown');

    // And the four answers are really answered.
    for (const answer of ['to', 'what', 'when', 'where']) assert.ok(REACHES[0][answer], `a destination that does not say ${answer}`);
  } finally {
    clearDeclaredDestinations();
  }
});

test('correo: no address or no password means no tool at all', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-vault-'));
  try {
    const ctx = { stateRoot, env: {}, config: { modules: { correo: { enabled: true, from: '', host: 'smtp.gmail.com' } } } };
    assert.deepEqual(await correo.toolsForTurn(ctx, { mode: 4 }), [], 'a tool was offered with nothing configured');

    ctx.config.modules.correo.from = 'her@gmail.com';
    assert.deepEqual(await correo.toolsForTurn(ctx, { mode: 4 }), [], 'a tool was offered with no password');

    await writeSecret(stateRoot, 'correo', 'app-password', 'abcdefghijklmnop');
    const [server] = await correo.toolsForTurn(ctx, { mode: 4 });
    assert.equal(server.name, 'correo');
    assert.deepEqual(server.tools, ['send_email']);
    assert.deepEqual(server.sends, ['send_email'], 'the tool did not declare that it sends');
    assert.equal(server.env.PULSE_SMTP_PASSWORD, 'abcdefghijklmnop', 'the password did not reach the server it is for');
    assert.ok(!server.brief.includes('abcdefghijklmnop'), 'the password reached the brief the model reads');

    // Switched off, nothing is handed over however configured it is.
    ctx.config.modules.correo.enabled = false;
    assert.deepEqual(await correo.toolsForTurn(ctx, { mode: 4 }), []);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test('correo: a module can only ask the vault for its own secrets', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-vault-'));
  try {
    await writeSecret(stateRoot, 'correo', 'app-password', 'la-de-correo');
    await writeSecret(stateRoot, 'otro-modulo', 'token', 'la-del-otro');
    // Every hook is handed the same narrowed vault; the module id is closed over inside the SDK,
    // so asking for somebody else's secret is not something a module can express.
    const ctx = { stateRoot, env: {}, config: { modules: { correo: { enabled: true, from: 'her@gmail.com' } } } };
    const described = await correo.describe(ctx);
    assert.deepEqual(described.held, [{ module: 'correo', name: 'app-password', bytes: 'la-de-correo'.length }]);
    assert.ok(!JSON.stringify(described).includes('la-de-correo'), 'a secret value reached the card');
    assert.ok(!JSON.stringify(described).includes('la-del-otro'), 'another module\'s secret reached this card');

    // And the card declares what it needs, so MADRE can draw the field without the module
    // writing any interface.
    assert.deepEqual(described.secrets.map((one) => one.name), ['app-password']);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test('correo: below #4 the sending tool is not offered, and nothing says it exists', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-vault-'));
  try {
    await writeSecret(stateRoot, 'correo', 'app-password', 'abcdefghijklmnop');
    const ctx = { stateRoot, env: {}, config: { modules: { correo: { enabled: true, from: 'her@gmail.com', host: 'smtp.gmail.com' } } } };

    for (const mode of [0, 1, 2, 3]) {
      const servers = await toolsForTurn(ctx, { agent: 'claude', mode });
      assert.equal(servers.find((one) => one.name === 'correo'), undefined, `the sending tool travelled at #${mode}`);
      // Not merely unusable: not mentioned. A tool the model is told about and cannot use is a
      // turn spent explaining itself.
      assert.ok(!JSON.stringify(servers).includes('send_email'), `send_email was named at #${mode}`);
    }

    const airlock = await toolsForTurn(ctx, { agent: 'claude', mode: 4 });
    const server = airlock.find((one) => one.name === 'correo');
    assert.ok(server, 'the tool was withheld at #4 AIRLOCK as well');
    assert.deepEqual(server.tools, ['send_email']);
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});
