import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// classList.add('a b') throws in the browser (a token cannot hold a space), and whatever came after it
// never ran: skipping the opening left its layer over the welcome for good (2026-10-28, loader.js).
// One class per argument: classList.add('a', 'b').
test('dom · no class name with a space in classList.add, remove, toggle or contains', async () => {
  const dir = join(import.meta.dirname, '..', 'public');
  const wrong = [];
  for (const name of (await readdir(dir)).filter((one) => one.endsWith('.js'))) {
    const text = await readFile(join(dir, name), 'utf8');
    for (const match of text.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g)) {
      for (const literal of match[1].matchAll(/'([^'\\]*)'|"([^"\\]*)"/g)) {
        const token = literal[1] ?? literal[2];
        if (/\s/.test(token.trim()) || (token && token !== token.trim())) wrong.push(`${name}: ${match[0].slice(0, 80)}`);
      }
    }
  }
  assert.deepEqual(wrong, []);
});
