// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Why an install or a sign-in went wrong, in one word (2026-10-28, docs/private/BIENVENIDA-1.0.6.md).
// Home threw these failures away: the person pressed Install, nothing happened, and no screen said
// why. The word is read from what the program itself printed; the page turns it into plain words and
// a way out (salas-mac.js, TROUBLE_WORDS). A failure nothing here recognises is `unknown`, and the
// page shows its last line as it was said rather than guess.

// A name nobody could look up (D-3): Go's resolver, which Ollama uses, says it this way. It is not
// a download that took too long, though it ends in «i/o timeout».
const DNS = /\blookup \S+ on \S+:53\b|no such host|server misbehaving|Temporary failure in name resolution/i;
// Go's words too, which Ollama prints (D-20): a connection that reached the server and did not
// finish is the network, not a download that took too long, though it ends in «timeout».
const NETWORK = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|getaddrinfo|socket hang up|network (is )?unreachable|unable to get local issuer|self[- ]signed certificate|request to https?:\/\/\S+ failed|TLS handshake timeout|connection reset by peer|no route to host|connect: connection refused/i;
// Ollama dropped or closed the connection mid-download (D-21, undici's TypeError: terminated / UND_ERR_SOCKET):
// said in plain words as Ollama closing, not a download that took too long.
// Only Ollama's own words, or undici's line alone: «terminated» inside an installer's output (npm's
// «Process terminated») is not Ollama closing, and installing an agent read as Ollama's download.
// The download itself marks its failure `ollama-closed` (src/ollama.mjs, pullModel).
const OLLAMA_CLOSED = /Ollama closed the connection|Ollama cerró la conexión|^(?:TypeError: )?terminated$|other side closed|UND_ERR_SOCKET/im;
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
  if (DNS.test(said)) return 'dns';
  if (OLLAMA_CLOSED.test(said)) return 'ollama-closed';
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
