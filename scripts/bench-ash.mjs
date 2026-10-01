import { readFile } from 'node:fs/promises';
import { ashInstruction, validateAshReply } from '../src/modules/ash-policy.mjs';

const corpus = JSON.parse(await readFile(new URL('../test/fixtures/ash-corpus.json', import.meta.url), 'utf8'));
const policyNeedles = {
  simple: 'lead with the answer',
  length: 'follow it exactly',
  code: 'Keep code and commands complete',
  structured: 'Keep the requested structure',
};
let policyMatches = 0;
let validationMatches = 0;
const failures = [];
for (const item of corpus) {
  const policy = ashInstruction(item.request).includes(policyNeedles[item.policy]);
  const validation = validateAshReply({ request: item.request, response: item.response }).ok === item.ok;
  if (policy) policyMatches += 1;
  if (validation) validationMatches += 1;
  if (!policy || !validation) failures.push({ id: item.id, policy, validation });
}

console.log(JSON.stringify({
  corpus: corpus.length,
  policyMatches,
  validationMatches,
  failures,
  note: 'Synthetic contract corpus; this does not measure token or cost savings.',
}, null, 2));
if (failures.length) process.exitCode = 1;
