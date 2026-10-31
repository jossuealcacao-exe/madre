// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Why an install or a sign-in went wrong, in one word (2026-10-28, docs/private/BIENVENIDA-1.0.6.md).
// Home threw these failures away: the person pressed Install, nothing happened, and no screen said
// why. The word is read from what the program itself printed; the page turns it into plain words and
// a way out (salas-mac.js, TROUBLE_WORDS). A failure nothing here recognises is `unknown`, and the
// page shows its last line as it was said rather than guess.

const NETWORK = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|getaddrinfo|socket hang up|network (is )?unreachable|unable to get local issuer|self[- ]signed certificate|request to https?:\/\/\S+ failed/i;
const PERMISSION = /EACCES|EPERM|permission denied|operation not permitted|access is denied/i;
const DISK = /ENOSPC|no space left/i;
const NO_NPM = /spawn npm(\.cmd)? ENOENT|npm(\.cmd)?: (command )?not found|'npm' is not recognized|command not found: npm/i;
const TIMEOUT = /timed out|timeout|ETIMEDOUT after|SIGTERM/i;
const NO_ZSTD = /requires zstd|install zstd/i;
const CANCELLED = /cancell?ed|aborted by the user/i;

export function installTrouble(text = '') {
  const said = String(text);
  if (NO_NPM.test(said)) return 'npm-missing';
  if (NO_ZSTD.test(said)) return 'zstd-missing';
  if (DISK.test(said)) return 'disk';
  if (NETWORK.test(said)) return 'network';
  if (PERMISSION.test(said)) return 'permission';
  if (TIMEOUT.test(said)) return 'timeout';
  return 'unknown';
}

export function loginTrouble({ refused = false, text = '' } = {}) {
  if (refused) return 'refused-account';
  const said = String(text);
  if (CANCELLED.test(said)) return 'cancelled';
  if (NETWORK.test(said)) return 'network';
  if (TIMEOUT.test(said)) return 'timeout';
  return 'unknown';
}
