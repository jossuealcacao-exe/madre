// What is shown of a command, and what is never shown.
//
// THE LAUNCH floor in the core prints the exact command MADRE would run, because a person who is
// handing their codebase to an agent deserves to read the line rather than trust a description of
// it. But a command line is not only a command line: adapters pass MCP server settings inline, and
// a server's environment is where keys live. A module somebody installs tomorrow can add one.
//
// So the arguments are shown whole except for environment VALUES, which are replaced everywhere
// they appear, whatever shape the adapter wrote them in. The names stay — knowing that
// GEMINI_API_KEY is set is the useful half, and the other half belongs in the keychain, not on a
// screen somebody may be sharing.
//
// This runs over what the adapters' own arg builders produced, so the core can never print a
// value the adapters did not print themselves — and cannot drift from them either.

export const HIDDEN = '<set for this turn, not shown>';

// Anything named like a credential has its value hidden even outside an env block.
const SECRETISH = /(TOKEN|KEY|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|BEARER|SESSION)/i;

// env objects anywhere in a parsed JSON argument, however deep an adapter nested them.
function hideEnv(value) {
  if (Array.isArray(value)) return value.map(hideEnv);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === 'env' && inner && typeof inner === 'object' && !Array.isArray(inner)) {
      out[key] = Object.fromEntries(Object.keys(inner).map((name) => [name, HIDDEN]));
    } else out[key] = hideEnv(inner);
  }
  return out;
}

// `mcp_servers.<name>.env={ NAME = "value", … }`, which is how Codex takes them.
const TOML_ENV = /^((?:[\w-]+\.)*env)=\{(.*)\}\s*$/s;
const TOML_PAIR = /([\w.-]+)\s*=\s*("(?:[^"\\]|\\.)*"|'[^']*')/g;

function hideTomlEnv(arg) {
  const found = TOML_ENV.exec(arg);
  if (!found) return null;
  const body = found[2].replace(TOML_PAIR, (_, name) => `${name} = ${HIDDEN}`);
  return `${found[1]}={${body}}`;
}

// `NAME=value` passed as one argument, when the name reads like a credential.
const PLAIN = /^([A-Z][A-Z0-9_]*)=(.+)$/s;

export function redactArgs(args = []) {
  return args.map((arg) => {
    if (typeof arg !== 'string') return arg;
    const toml = hideTomlEnv(arg);
    if (toml) return toml;
    const plain = PLAIN.exec(arg);
    if (plain && SECRETISH.test(plain[1])) return `${plain[1]}=${HIDDEN}`;
    const trimmed = arg.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try { return JSON.stringify(hideEnv(JSON.parse(trimmed))); } catch { /* not JSON after all: it is shown as the adapter wrote it */ }
    }
    return arg;
  });
}
