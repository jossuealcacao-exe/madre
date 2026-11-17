// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { fichaShown, withoutFicha } from '../src/ficha.mjs';

// L-15 (Carlos's server, 2026-11-14): MADRE wrote «MADRE is ready» with its whole address and its
// ficha, and a start script sent that line to a log other users of the server could read. The key
// is written only where a person reads it at once — a terminal — or where the desktop app reads it
// to open MADRE; a log gets the address without it.
test('ficha · the access key is written to a terminal or to the app, never to a log (L-15)', () => {
  const log = { isTTY: false };
  const terminal = { isTTY: true };
  assert.equal(fichaShown({ stream: log, env: {} }), false, 'a log got the key');
  assert.equal(fichaShown({ stream: terminal, env: {} }), true);
  assert.equal(fichaShown({ stream: log, env: { MADRE_APP: '1' } }), true, 'the app could not open MADRE');
  assert.equal(fichaShown({ stream: log, env: { PULSE_PRINT_FICHA: '1' } }), true);
  assert.equal(withoutFicha('http://127.0.0.1:4317/salas?ficha=abc123'), 'http://127.0.0.1:4317/salas');
  assert.equal(withoutFicha('http://127.0.0.1:4318/?ficha=abc&chat=x'), 'http://127.0.0.1:4318/?chat=x');
  assert.equal(withoutFicha('http://127.0.0.1:4318/'), 'http://127.0.0.1:4318/');
});
