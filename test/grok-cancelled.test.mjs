// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «Grok se detuvo: un paso necesitaba una aprobación…» for a turn that had been stopped (2026-11-19,
// the author). Grok writes the same close, `errors: ["cancelled"]`, when a step waits for an approval
// (exit 0) and when something outside stops it (a SIGTERM, exit 143: tried with the real CLI 1.0.77).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { invokeGrok, parseGrokOutput } from '../src/adapters/grok.mjs';

const close = { type: 'result', subtype: 'error_during_execution', is_error: true, stop_reason: 'cancelled', errors: ['cancelled'] };
const waitingOn = (name) => [
  { type: 'system', subtype: 'init', tools: ['read_file', name] },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a', name: 'read_file' }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', content: 'ok' }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'b', name }] } },
  close,
];

async function fakeGrok(lines, exitCode) {
  const dir = await mkdtemp(join(tmpdir(), 'madre-fake-grok-'));
  const file = join(dir, 'grok');
  await writeFile(file, `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(lines.map((line) => JSON.stringify(line)).join('\n') + '\n')});\nprocess.exitCode = ${exitCode};\n`);
  await chmod(file, 0o755);
  return { dir, file };
}

test('grok: a turn stopped from outside says it was stopped, not that it waited for an approval', async () => {
  const { dir, file } = await fakeGrok([{ type: 'system', subtype: 'init' }, close], 143);
  try {
    await assert.rejects(invokeGrok({ executable: file, projectRoot: dir, prompt: 'hola', timeoutMs: 20000 }), (error) => {
      assert.match(error.message, /SIGTERM/);
      assert.doesNotMatch(error.message, /approval|aprobación/);
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('grok: a turn that really waited for an approval says so, and names the tool it waited on', async () => {
  const { dir, file } = await fakeGrok(waitingOn('image_gen'), 0);
  try {
    await assert.rejects(invokeGrok({ executable: file, projectRoot: dir, prompt: 'hola', timeoutMs: 20000 }), (error) => {
      assert.match(error.message, /image_gen/);
      assert.match(error.message, /approval|aprobación/);
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  // Without the exit code (an older caller), the close still reads as the approval it usually is.
  assert.match(parseGrokOutput(waitingOn('web_fetch').map((line) => JSON.stringify(line)).join('\n')).error, /web_fetch/);
});
