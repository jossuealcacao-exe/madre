// What left this machine.
//
// MADRE runs on your computer and keeps everything it knows in a file you own, and that sentence
// is worth exactly as much as the list that qualifies it. Something does leave: a version check,
// an embedding, a crash report, the briefing itself. A person deciding whether to point this at a
// private codebase needs that list to be complete, and needs it to come from the code rather than
// from a promise in a README.
//
// So there are two halves here and they are different things.
//
// DESTINATIONS is the declaration: every address MADRE's own process may reach, what it says
// there, what puts it on and where you turn it off. It is written by hand because it says what a
// request MEANS, and no wrapper can know that.
//
// The log is the check on the declaration. Every fetch the room's process makes goes through one
// wrapper — MADRE's own calls and any a module makes, because a module installed tomorrow runs
// inside this process and cannot opt out of it — and lands in a line saying where it went and
// when. An address nobody declared shows up as one nobody declared, which is the whole point.
//
// What is never recorded: bodies, headers, and the values of query parameters. The names stay.
// The Gemini embedding endpoint takes the key in the URL, and a log of what left this machine
// would be a poor place to leave it.

import { appendFile, mkdir, open, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const KEEP = 200;                 // lines held for the screen
export const MAX_BYTES = 512 * 1024;     // the file is trimmed to the last KEEP lines past this
const LOCAL = new Set(['127.0.0.1', 'localhost', '::1', '0.0.0.0', '[::1]']);

// Where an unknown condition goes when somebody presses SEND. It lives here because this is the
// file that has to name every address MADRE can reach; the room reads it from here.
export const DEFAULT_REPORT_URL = 'https://madre-reports.jossue-alcala-o.workers.dev/v1/reports';

// The declaration. `what` is the honest sentence: what a request carries, not what it is called.
export const DESTINATIONS = [
  {
    id: 'crew', host: null, to: 'whoever runs the agent you send a turn to',
    what: 'The briefing — the document above, your question, the memories it summoned and the transcript it carries.',
    when: 'every turn you send to an agent that is not @madre',
    where: 'you choose it every time you send a turn; @madre answers on this computer and sends nothing',
    inside: false,
  },
  {
    id: 'embeddings', host: 'generativelanguage.googleapis.com', match: (url) => /batchEmbedContents/.test(url.pathname), to: 'Google · Gemini embeddings',
    what: 'The text of what is being embedded: the first 2000 characters of each memory, and the question a recall is made of.',
    when: 'a memory is written or recalled, while embeddings are set to Gemini',
    where: 'MU/TH/UR → MEMORY → EMBEDDINGS · OLLAMA keeps it on this computer, OFF drops back to words',
    inside: true,
  },
  {
    id: 'image', host: 'generativelanguage.googleapis.com', match: (url) => /generateContent/.test(url.pathname), to: 'Google · Gemini image model',
    what: 'The prompt an agent wrote for an image.',
    when: 'an agent calls the image tool during a lease',
    where: 'MODULES → IMAGE STUDIO',
    // It runs in a process of its own and writes its own line into this same log, so it is here.
    inside: true,
  },
  {
    id: 'npm', host: 'registry.npmjs.org', to: 'the npm registry',
    what: 'The name of a package, to read the version of its latest release. Nothing about you or your project.',
    when: 'at most once a day per package, while the release channel is on',
    where: 'MU/TH/UR → RELEASE CHANNEL · or PULSE_UPDATE_CHECK=0',
    inside: true,
  },
  {
    id: 'github', host: 'api.github.com', to: 'GitHub',
    what: 'The name of a repository, to read the tag of its latest release. Nothing about you or your project.',
    when: 'at most once a day per repository, while the release channel is on',
    where: 'MU/TH/UR → RELEASE CHANNEL · or PULSE_UPDATE_CHECK=0',
    inside: true,
  },
  {
    id: 'reports', host: new URL(DEFAULT_REPORT_URL).hostname, to: "the author's error collector",
    what: 'An unknown condition: what broke, where in MADRE, and the version. Paths are cut back and your words are not in it.',
    when: 'you press SEND — or on its own, only while auto-report is on',
    where: 'MU/TH/UR → AUTO-REPORT UNKNOWN CONDITIONS · or PULSE_REPORT_URL',
    inside: true,
  },
  {
    id: 'anthropic', host: 'api.anthropic.com', to: 'Anthropic',
    what: 'Your Claude Code token, to read how much of your plan is left. It is read from where Claude keeps it and never stored by MADRE.',
    when: 'while a Claude session is being watched for its quota',
    where: '⚙ CONNECTIONS → CLAUDE',
    inside: true,
  },
  {
    id: 'ollama', host: null, local: true, to: 'Ollama, on this computer',
    what: 'Memories to embed, exchanges to distil, and whatever you ask @madre. It goes to a port on this machine and stops there.',
    when: 'while Ollama is running',
    where: 'MODULES → OLLAMA',
    inside: true,
  },
];

const byId = new Map(DESTINATIONS.map((one) => [one.id, one]));
export const destination = (id) => byId.get(id) ?? null;

// Which declaration a URL belongs to. An address nobody declared is said to be exactly that.
export function classify(rawUrl, { reportHost = null } = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { return { id: 'unknown', to: String(rawUrl).slice(0, 80), local: false }; }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (LOCAL.has(host)) return { id: url.port === '11434' ? 'ollama' : 'room', to: `${host}:${url.port || '80'}`, local: true };
  if (reportHost && host === reportHost) return { id: 'reports', to: byId.get('reports').to, local: false };
  for (const one of DESTINATIONS) {
    if (!one.host || one.host !== host) continue;
    if (one.match && !one.match(url)) continue;
    return { id: one.id, to: one.to, local: false };
  }
  return { id: 'unknown', to: host, local: false };
}

// One line of the log. No body, no headers, and no query VALUES — only which parameters were set.
export function lineFor({ url, method = 'GET', status = null, ok = false, ms = 0, bytes = null, error = null, at, reportHost = null }) {
  const kind = classify(url, { reportHost });
  let path = '';
  let params = [];
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
    params = [...parsed.searchParams.keys()];
  } catch { path = ''; }
  return {
    at: at ?? new Date().toISOString(),
    id: kind.id,
    to: kind.to,
    local: Boolean(kind.local),
    method: String(method || 'GET').toUpperCase(),
    path,
    ...(params.length ? { params } : {}),
    ...(Number.isFinite(status) ? { status } : {}),
    ok: Boolean(ok),
    ms: Math.round(ms),
    ...(Number.isFinite(bytes) ? { bytes } : {}),
    ...(error ? { error } : {}),
  };
}

async function tail(file, window = 96 * 1024) {
  let handle;
  try {
    const size = (await stat(file)).size;
    if (!size) return [];
    handle = await open(file, 'r');
    const length = Math.min(window, size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    const lines = buffer.toString('utf8').split('\n').filter(Boolean);
    const out = [];
    for (const line of lines) {
      try { out.push(JSON.parse(line)); } catch { /* a half line at the window's edge */ }
    }
    return out;
  } catch {
    return [];
  } finally {
    await handle?.close().catch(() => {});
  }
}

export class OutboundLog {
  #file;
  #keep;
  #recent = [];
  #counts = new Map();
  #writes = Promise.resolve();
  #reportHost = null;
  #restore = null;

  constructor({ file = null, keep = KEEP } = {}) {
    this.#file = file;
    this.#keep = keep;
  }

  // The collector's address is a setting, so which host counts as the collector is read live.
  watchReportUrl(url) {
    try { this.#reportHost = url ? new URL(url).hostname : null; } catch { this.#reportHost = null; }
    return this;
  }

  async load() {
    if (!this.#file) return this;
    const lines = await tail(this.#file);
    this.#recent = lines.slice(-this.#keep);
    for (const line of this.#recent) this.#count(line);
    return this;
  }

  #count(line) {
    const at = this.#counts.get(line.id) ?? { calls: 0, failed: 0, last: null };
    at.calls += 1;
    if (!line.ok) at.failed += 1;
    at.last = line.at;
    this.#counts.set(line.id, at);
  }

  record(input) {
    const line = lineFor({ ...input, reportHost: this.#reportHost });
    this.#recent.push(line);
    if (this.#recent.length > this.#keep) this.#recent.splice(0, this.#recent.length - this.#keep);
    this.#count(line);
    if (this.#file) {
      this.#writes = this.#writes
        .then(async () => {
          await mkdir(dirname(this.#file), { recursive: true }).catch(() => {});
          await appendFile(this.#file, `${JSON.stringify(line)}\n`);
          const size = await stat(this.#file).then((one) => one.size, () => 0);
          // Only a writer that is holding a full screen of lines may rewrite the file: the
          // image studio appends from its own process and knows nothing of what came before it.
          if (size > MAX_BYTES && this.#recent.length >= this.#keep) await writeFile(this.#file, `${this.#recent.map((one) => JSON.stringify(one)).join('\n')}\n`);
        })
        .catch(() => null);
    }
    return line;
  }

  recent({ limit = 40 } = {}) { return this.#recent.slice(-limit).reverse(); }

  counts() { return Object.fromEntries(this.#counts); }

  // The wrapper. It never changes what the caller gets back and never reads the response body:
  // a log that consumed what it watched would break the thing it is watching.
  watch(fetchImpl = globalThis.fetch) {
    if (fetchImpl?.watched) return fetchImpl;
    const log = this;
    const watched = async function outbound(resource, init = {}) {
      const url = typeof resource === 'string' ? resource : (resource?.url ?? String(resource));
      const method = init?.method ?? resource?.method ?? 'GET';
      const bytes = typeof init?.body === 'string' ? Buffer.byteLength(init.body) : null;
      const started = Date.now();
      try {
        const response = await fetchImpl(resource, init);
        log.record({ url, method, bytes, status: response?.status ?? null, ok: Boolean(response?.ok), ms: Date.now() - started });
        return response;
      } catch (error) {
        // The name and the code, never the message: a message carries the address it failed on
        // and sometimes what was in it.
        log.record({ url, method, bytes, ok: false, ms: Date.now() - started, error: error?.code ?? error?.name ?? 'failed' });
        throw error;
      }
    };
    watched.watched = true;
    return watched;
  }

  // Everything in this process, including whatever a module calls. Returns the undo.
  install(target = globalThis) {
    if (this.#restore) return this.#restore;
    const original = target.fetch;
    // Binding makes a new function, which would hide a watch somebody else already installed;
    // the mark travels with it so one process logs a request once.
    const bound = original.bind(target);
    bound.watched = original.watched;
    target.fetch = this.watch(bound);
    this.#restore = () => { target.fetch = original; this.#restore = null; };
    return this.#restore;
  }

  async drain() { await this.#writes; }
}

// The declaration with today's answer filled in: is this one on, and what has it done.
export function outboundView({ log = null, state = {}, agents = [] } = {}) {
  const counts = log?.counts() ?? {};
  const vendors = { codex: 'OpenAI', claude: 'Anthropic', gemini: 'Google', opencode: 'the provider OpenCode is signed in to' };
  const crew = agents.filter((agent) => agent.detected && !agent.local).map((agent) => `@${agent.id} → ${vendors[agent.id] ?? 'its own provider'}`);
  const destinations = DESTINATIONS.map((one) => ({
    id: one.id,
    to: one.id === 'crew' && crew.length ? crew.join(' · ') : one.to,
    what: one.what,
    when: one.when,
    where: one.where,
    local: Boolean(one.local),
    // Whether the call lands in the log at all. Everything MADRE starts does, the image studio
    // from its own process included; the crew's own conversation with its provider does not.
    inside: Boolean(one.inside),
    on: state[one.id] ?? null,
    calls: counts[one.id]?.calls ?? 0,
    failed: counts[one.id]?.failed ?? 0,
    last: counts[one.id]?.last ?? null,
  }));
  const undeclared = counts.unknown?.calls ?? 0;
  return {
    destinations,
    recent: log?.recent({ limit: 40 }) ?? [],
    undeclared,
    says: undeclared
      ? `${undeclared} request${undeclared === 1 ? '' : 's'} went to an address nothing here declares. A module can do that; nothing can do it unlogged.`
      : 'Every request this process made went to an address declared above.',
  };
}
