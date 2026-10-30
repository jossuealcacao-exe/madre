#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Every commit someone other than the author proposes carries its sign-off (2026-10-30): the
// Developer Certificate of Origin, `Signed-off-by: Name <email>` with the commit's own author, the
// first half of what CLA.md asks. The CLA itself is a comment on the pull request, read by the
// author before merging; this only refuses what can be checked by a machine.
//
//   node scripts/dco-check.mjs <base> <head>     (CI: origin/main and the pull request's head)
//
// The author's own commits do not need it: the code is his. Merge commits are skipped.
import { execFileSync } from 'node:child_process';

export const AUTHOR_EMAILS = ['jossue.alcala.o@gmail.com', 'hola@jossuealcala.com'];

// Which commits lack what they need, from `git log` records: { sha, email, body, parents }.
export function unsigned(commits, { owners = AUTHOR_EMAILS } = {}) {
  return commits.filter((one) => {
    if (one.parents > 1) return false;
    const email = String(one.email ?? '').toLowerCase();
    if (owners.includes(email)) return false;
    const signed = [...String(one.body ?? '').matchAll(/^Signed-off-by:\s*.+<([^>]+)>\s*$/gim)].map((match) => match[1].toLowerCase());
    return !signed.includes(email);
  });
}

function commitsBetween(base, head) {
  const SEP = '\u001e';
  const out = execFileSync('git', ['log', '--format=%H%x1f%ae%x1f%P%x1f%B' + SEP, `${base}..${head}`], { encoding: 'utf8' });
  return out.split(SEP).map((one) => one.trim()).filter(Boolean).map((one) => {
    const [sha, email, parents, body] = one.split('\u001f');
    return { sha, email, parents: parents.trim().split(/\s+/).filter(Boolean).length, body };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) { console.error('Uso: node scripts/dco-check.mjs <base> <head>'); process.exit(2); }
  const missing = unsigned(commitsBetween(base, head));
  if (!missing.length) { console.log('✓ Cada commit lleva su Signed-off-by (CLA.md).'); process.exit(0); }
  console.error('✗ Estos commits no llevan Signed-off-by con el correo de quien los escribió (CLA.md, CONTRIBUTING.md):');
  for (const one of missing) console.error(`  ${one.sha.slice(0, 10)}  ${one.email}`);
  console.error('Firma cada uno con «git commit -s» (o «git rebase --signoff» sobre la rama) y vuelve a enviar.');
  process.exit(1);
}
