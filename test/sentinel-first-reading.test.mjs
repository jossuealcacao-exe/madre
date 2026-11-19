// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What the sentinel's first reading asked of MADRE itself (S-1…S-20 and D-31…D-35, 2026-11-09):
// an empty answer from OpenCode that says why, an installer that cannot run at all, and a ledger
// whose folder is gone. The cards for what comes from outside are in test/sentinel.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseOpenCodeOutput } from '../src/adapters/opencode.mjs';
import { runInstaller } from '../src/extensions.mjs';
import { EventStore } from '../src/event-store.mjs';

const lines = (...events) => events.map((event) => JSON.stringify(event)).join('\n');

test('OpenCode: an empty answer says why, when its events tell (D-32, S-1)', () => {
  const thought = parseOpenCodeOutput(lines({ type: 'step_start' }, { type: 'reasoning', part: { text: 'hmm…' } }, { type: 'step_finish', part: { reason: 'stop', tokens: { input: 1, output: 0 } } }));
  assert.equal(thought.text, '');
  assert.match(thought.error, /only thought and wrote no answer/);
  const tools = parseOpenCodeOutput(lines({ type: 'step_start' }, { type: 'tool_use', part: { tool: 'read' } }, { type: 'step_finish', part: { reason: 'tool-calls' } }));
  assert.match(tools.error, /used its tools and stopped before writing an answer/);
  const long = parseOpenCodeOutput(lines({ type: 'step_finish', part: { reason: 'length' } }));
  assert.match(long.error, /ran out of room/);
  // An answer is an answer, and nothing to say is still the plain clean exit.
  assert.equal(parseOpenCodeOutput(lines({ type: 'text', part: { text: 'hola' } }, { type: 'step_finish', part: { reason: 'tool-calls' } })).error, undefined);
  assert.equal(parseOpenCodeOutput('').error, undefined);
});

test('an installer that cannot be run at all is said, not an unhandled rejection (S-7)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-enoexec-'));
  try {
    // A file marked as a program that is none: no interpreter line, no machine code.
    const fake = join(root, 'not-a-program');
    await writeFile(fake, 'just some words\n');
    await chmod(fake, 0o755);
    const result = await runInstaller({ command: fake, args: [], projectRoot: root, timeoutMs: 5000 });
    // On Linux the system hands a file without an interpreter line to /bin/sh, which says «command not
    // found» and ends with 127: an ordinary failed run. Elsewhere it cannot start at all, and that is said.
    if (process.platform === 'linux' && result.code === 127) return;
    assert.equal(result.code, 1);
    assert.match(String(result.error ?? ''), /cannot be run|ENOEXEC|exec format/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the ledger writes on when its folder was taken away under it (D-34)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'madre-lockless-'));
  try {
    const file = join(root, 'room', 'events.jsonl');
    const store = await new EventStore(file).initialize();
    await store.append('note', { n: 1 });
    await rm(join(root, 'room'), { recursive: true, force: true });
    await store.append('note', { n: 2 });
    assert.match(await readFile(file, 'utf8'), /"n":2/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
