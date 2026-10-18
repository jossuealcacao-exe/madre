import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

// The door `madre` comes in by (2026-10-18): an old Node is told what to do, in words it can read,
// instead of stopping on the syntax of madre.mjs before its own check could speak.
test('launcher · an old Node is told it needs 22.5 and how to get it; a current one goes on to MADRE', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.bin, { madre: './bin/madre.cjs', pulse: './bin/madre.cjs' });
  const dir = await mkdtemp(join(tmpdir(), 'madre-launcher-'));
  const old = join(dir, 'old-node.cjs');
  await writeFile(old, "Object.defineProperty(process, 'versions', { value: Object.assign({}, process.versions, { node: '12.22.9' }) });\nObject.defineProperty(process, 'version', { value: 'v12.22.9' });\n");
  const refused = await run(process.execPath, ['--require', old, 'bin/madre.cjs', '--version']).then(() => null, (error) => error);
  assert.ok(refused, 'an old Node went on');
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /MADRE necesita Node 22\.5 o más nuevo, y esta computadora tiene v12\.22\.9/);
  assert.match(refused.stderr, /nodejs\.org/);
  assert.match(refused.stderr, /MADRE needs Node 22\.5 or newer/);
  const { stdout } = await run(process.execPath, ['bin/madre.cjs', '--version']);
  assert.match(stdout, /^madre \d+\.\d+\.\d+/);
});
