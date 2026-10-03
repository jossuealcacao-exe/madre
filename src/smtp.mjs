// SMTP, enough of it to send one message over TLS. No dependencies, by the same rule as the rest
// of MADRE: a library that handles the human's mail password is a library somebody has to read.
//
// What it does: open a TLS socket, greet, authenticate, hand over one message, quit. What it does
// NOT do: STARTTLS on a plaintext port (the session would begin in the clear), attachments,
// multipart, or any form of queuing. One message, encrypted from the first byte, or nothing.
//
// The protocol is a dialogue of three-digit replies. A reply may span lines — `250-` continues,
// `250 ` ends — and that is the only parsing subtlety here.

import { connect } from 'node:tls';

export const SMTP_PORT = 465;                  // implicit TLS. Never 25, never 587 without TLS.
const CRLF = '\r\n';

// A reply ends at the first COMPLETE line whose code is followed by a space rather than a hyphen:
// `250-` continues, `250 ` ends. The line has to carry its own newline, or a chunk that split
// mid-line would be read as a finished answer.
const ENDS = /^(\d{3})(?: [^\r\n]*)?\r\n/m;

// An address, strictly enough that it cannot carry a second one. A newline in a header is how a
// message gets extra recipients nobody typed, so anything with control characters is refused
// rather than escaped.
const ADDRESS = /^[^\s<>@,;:"\\\u0000-\u001f]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
export const validAddress = (value) => ADDRESS.test(String(value ?? '').trim());

// A header value, with the one thing that must never survive: a line break. Folding is not
// attempted — a long subject travels long — because a header that folds wrongly is a header that
// injects.
export const headerSafe = (value) => String(value ?? '').replace(/[\r\n\u0000]+/g, ' ').trim();

// Anything non-ASCII in a header has to be encoded or it arrives as mojibake. RFC 2047, base64,
// whole-value: simpler than word-splitting and correct for the subjects people actually write.
export function encodeHeader(value) {
  const clean = headerSafe(value);
  if (!clean || /^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

// A line beginning with a dot ends the DATA stage. Doubling it is the protocol's own escape, and
// forgetting it is how a message gets truncated by its own body.
export const dotStuff = (body) => String(body ?? '').replace(/\r?\n/g, CRLF).replace(/^\./gm, '..');

export function buildMessage({ from, fromName = '', to, subject, body, date = new Date() }) {
  const sender = fromName ? `${encodeHeader(fromName)} <${from}>` : from;
  const headers = [
    `From: ${sender}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return `${headers.join(CRLF)}${CRLF}${CRLF}${dotStuff(body)}`;
}

// One conversation. Every step says what it expects, so a refusal names the step it failed at
// instead of surfacing as a bare three-digit code.
export async function sendMail({ host = 'smtp.gmail.com', port = SMTP_PORT, user, password, from, fromName = '', to, subject, body, timeoutMs = 20000, connectImpl = connect, date = undefined }) {
  const recipients = (Array.isArray(to) ? to : [to]).map((one) => String(one ?? '').trim()).filter(Boolean);
  if (!validAddress(from)) throw Object.assign(new Error('The sending address is not an address.'), { code: 'BAD_FROM' });
  if (!recipients.length) throw Object.assign(new Error('Say who it goes to.'), { code: 'NO_RECIPIENT' });
  for (const one of recipients) {
    if (!validAddress(one)) throw Object.assign(new Error(`That is not an address: ${one}`), { code: 'BAD_RECIPIENT' });
  }
  if (!password) throw Object.assign(new Error('There is no app password in the vault for this connector.'), { code: 'NO_SECRET' });

  const socket = connectImpl({ host, port, servername: host });
  socket.setEncoding('utf8');
  socket.setTimeout(timeoutMs);

  let buffer = '';
  let waiting = null;
  const fail = (error) => { if (waiting) { const { reject } = waiting; waiting = null; reject(error); } };
  socket.on('error', (error) => fail(Object.assign(error, { code: error.code ?? 'SMTP_SOCKET' })));
  socket.on('timeout', () => { socket.destroy(); fail(Object.assign(new Error(`${host} stopped answering.`), { code: 'SMTP_TIMEOUT' })); });
  socket.on('close', () => fail(Object.assign(new Error(`${host} closed the connection.`), { code: 'SMTP_CLOSED' })));
  socket.on('data', (chunk) => {
    buffer += chunk;
    const done = buffer.match(ENDS);
    if (!done || !waiting) return;
    const text = buffer.trim();
    buffer = '';
    const { resolve } = waiting;
    waiting = null;
    resolve({ code: Number(done[1]), text });
  });

  const read = () => new Promise((resolve, reject) => { waiting = { resolve, reject }; });
  const say = async (line, expect, step) => {
    if (line !== null) socket.write(`${line}${CRLF}`);
    const reply = await read();
    if (!expect.includes(reply.code)) {
      socket.destroy();
      throw Object.assign(new Error(`${host} refused at ${step}: ${reply.text.split(/\r?\n/)[0]}`), { code: `SMTP_${reply.code}`, step, reply: reply.text });
    }
    return reply;
  };

  try {
    await say(null, [220], 'greeting');
    await say(`EHLO ${from.split('@')[1]}`, [250], 'EHLO');
    // AUTH LOGIN: the user and the password, each base64, each on its own line. Chosen over
    // PLAIN because it is what Gmail documents for app passwords.
    await say('AUTH LOGIN', [334], 'AUTH');
    await say(Buffer.from(user ?? from, 'utf8').toString('base64'), [334], 'user');
    await say(Buffer.from(password, 'utf8').toString('base64'), [235], 'password');
    await say(`MAIL FROM:<${from}>`, [250], 'MAIL FROM');
    for (const one of recipients) await say(`RCPT TO:<${one}>`, [250, 251], 'RCPT TO');
    await say('DATA', [354], 'DATA');
    const message = buildMessage({ from, fromName, to: recipients, subject, body, ...(date ? { date } : {}) });
    const accepted = await say(`${message}${CRLF}.`, [250], 'message');
    socket.write(`QUIT${CRLF}`);
    socket.end();
    return { ok: true, to: recipients, bytes: Buffer.byteLength(message, 'utf8'), reply: accepted.text.split(/\r?\n/)[0] };
  } catch (error) {
    socket.destroy();
    throw error;
  }
}
