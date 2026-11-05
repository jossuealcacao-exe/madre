import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { memoryServerFor } from '../src/memory-tools.mjs';
import { watchOutbound } from '../src/mcp/memory-server.mjs';

// RX-20 (external review #20): with Gemini chosen for the memory, the searches pulse-memory embeds
// went to Google from its own process, and «What leaves» — which promises to see every fetch — never
// showed them. The server now gets the room's log and writes there, as the mail, GitHub and image
// servers already did.
test('pulse-memory writes what it sends to Gemini in the room\'s «What leaves», never what was searched (RX-20)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'madre-rx20-'));
  try {
    const file = join(dir, 'outbound.jsonl');
    const server = memoryServerFor({ dbFile: join(dir, 'memory.sqlite'), projectRoot: dir, env: { PULSE_OUTBOUND_LOG: file } });
    assert.equal(server.env.PULSE_OUTBOUND_LOG, file, 'the server is not told where the room keeps its log');
    assert.equal(memoryServerFor({ dbFile: join(dir, 'memory.sqlite'), projectRoot: dir, env: {} }).env.PULSE_OUTBOUND_LOG, undefined);

    const target = { fetch: async () => ({ ok: true, status: 200, json: async () => ({ embeddings: [] }) }) };
    assert.equal(watchOutbound({}, target), null, 'without a log there is nothing to install');
    const undo = watchOutbound({ PULSE_OUTBOUND_LOG: file }, target);
    assert.equal(typeof undo, 'function');
    const said = 'paciente PRUEBA-01, curación del 4 de noviembre';
    await target.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=SECRETA', { method: 'POST', body: JSON.stringify({ requests: [{ content: { parts: [{ text: said }] } }] }) });
    let lines = [];
    for (let tries = 0; tries < 40 && !lines.length; tries += 1) {
      lines = (await readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean);
      if (!lines.length) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(lines.length, 1, 'the send to Gemini was not written');
    const line = JSON.parse(lines[0]);
    assert.equal(line.id, 'embeddings');
    assert.equal(line.method, 'POST');
    assert.equal(line.ok, true);
    assert.doesNotMatch(lines[0], /PRUEBA-01|curación|SECRETA/, 'what was searched, or the key, reached the log');
    undo();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const source = await readFile(new URL('../src/mcp/memory-server.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(invokedDirectly\) \{\n\s*try \{\n\s*watchOutbound\(\);/, 'the server does not install the log when it starts');
});
