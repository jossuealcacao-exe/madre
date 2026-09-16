import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReadonlyProcess } from './process.mjs';

export const geminiReadonlyPolicy = `[[rule]]
toolName = "*"
decision = "deny"
priority = 998
interactive = false
denyMessage = "PULSE consultation mode only permits local project reads."

[[rule]]
toolName = ["read_file", "list_directory", "glob", "grep_search"]
decision = "allow"
priority = 999
interactive = false
`;

// Only credentials are carried into the isolated home: OAuth tokens, the
// account marker, the installation id and ~/.gemini/.env (where users may keep
// GEMINI_API_KEY). Keys stored in the OS keychain need no copy. Hooks,
// extensions, MCP servers, memory files and history stay behind.
export const geminiCredentialFiles = ['oauth_creds.json', 'google_accounts.json', 'installation_id', '.env'];

// The read-only policy plus, under a lease, allow rules for the write tools
// whose file_path argument starts with the lease directory. Plan mode would
// block every write regardless of policy, so a lease uses approval "default":
// headless Gemini cannot prompt, so anything the policy does not allow fails.
export function geminiLeasePolicy(outDir) {
  const escaped = outDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `${geminiReadonlyPolicy}
[[rule]]
toolName = ["write_file", "replace", "edit"]
argsPattern = '"file_path"\\s*:\\s*"${escaped}/'
decision = "allow"
priority = 1000
interactive = false
`;
}

export function buildGeminiArgs({ projectRoot, prompt, policyPath, model = null, attachmentsDir = null, lease = null }) {
  const includes = [projectRoot, attachmentsDir, lease?.outDir].filter(Boolean).join(',');
  return [
    ...(model && model !== 'auto' ? ['--model', model] : []),
    '--approval-mode', lease ? 'default' : 'plan',
    // stream-json emits init / tool_use / message deltas / result as JSONL, so
    // PULSE can tell a thinking Gemini from a hung one.
    '--output-format', 'stream-json',
    '--skip-trust',
    '--include-directories', includes,
    '--policy', policyPath,
    '--prompt', prompt,
  ];
}

export function buildGeminiEnvironment({ runtimeRoot, environment = process.env }) {
  return {
    ...environment,
    // Storage resolves ~/.gemini from this root, so settings, hooks and
    // extensions are read from the temporary home instead of the real one.
    GEMINI_CLI_HOME: runtimeRoot,
    // The launcher otherwise re-spawns itself in a second process that owns
    // the request; a SIGTERM to the launcher would not stop the model call.
    GEMINI_CLI_NO_RELAUNCH: 'true',
  };
}

export function isolateGeminiSettings(settings) {
  const auth = settings?.security?.auth;
  return auth ? { security: { auth } } : {};
}

export async function prepareGeminiHome({ runtimeRoot, sourceHome = join(homedir(), '.gemini') }) {
  const geminiDir = join(runtimeRoot, '.gemini');
  await mkdir(geminiDir, { recursive: true, mode: 0o700 });
  for (const name of geminiCredentialFiles) {
    await copyFile(join(sourceHome, name), join(geminiDir, name)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  let settings = {};
  try {
    settings = JSON.parse(await readFile(join(sourceHome, 'settings.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  await writeFile(join(geminiDir, 'settings.json'), JSON.stringify(isolateGeminiSettings(settings)), { mode: 0o600 });
  return geminiDir;
}

function usageFromStats(stats) {
  const models = Object.values(stats?.models ?? {});
  if (!models.length) return null;
  const totals = models.reduce((usage, model) => {
    // Two shapes exist: the older { tokens: { prompt, candidates, total, cached, thoughts } }
    // and stream-json's flat { input_tokens, output_tokens, total_tokens, cached }.
    const tokens = model?.tokens ?? model ?? {};
    const input = tokens.prompt ?? tokens.input_tokens ?? tokens.input ?? 0;
    const output = tokens.candidates ?? tokens.output_tokens ?? 0;
    usage.inputTokens += input;
    usage.cachedInputTokens += tokens.cached ?? 0;
    usage.outputTokens += output;
    usage.reasoningTokens += tokens.thoughts ?? 0;
    usage.totalTokens += tokens.total ?? tokens.total_tokens ?? (input + output);
    return usage;
  }, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, source: 'gemini-json' });
  return totals;
}

// Accepts stream-json (JSONL events) and, for compatibility, the single-object
// output of `--output-format json`.
export function parseGeminiOutput(output) {
  const trimmed = String(output ?? '').trim();
  if (!trimmed) return { text: '', usage: null };
  const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  const events = [];
  for (const line of lines) {
    try { events.push(JSON.parse(line)); } catch { /* diagnostics between events */ }
  }
  if (events.length === 1 && !events[0].type && (events[0].response !== undefined || events[0].error || events[0].stats)) {
    const result = events[0];
    if (result.error) return { text: '', usage: null, error: result.error.message ?? 'Gemini returned an error.' };
    return { text: typeof result.response === 'string' ? result.response.trim() : '', usage: usageFromStats(result.stats) };
  }
  let text = '';
  let usage = null;
  let error = null;
  let toolCalls = 0;
  for (const event of events) {
    if (event.type === 'message' && event.role === 'assistant' && typeof event.content === 'string') text += event.content;
    if (event.type === 'tool_use') toolCalls += 1;
    if (event.type === 'error' || (event.type === 'result' && event.status && event.status !== 'success')) {
      error = event.error?.message ?? event.message ?? `Gemini finished with status ${event.status ?? 'error'}.`;
    }
    if (event.type === 'result') usage = usageFromStats(event.stats);
  }
  return { text: text.trim(), usage, toolCalls, ...(error ? { error } : {}) };
}

// Best-effort removal of the temporary home. A killed Gemini may still be
// flushing files for a moment, which makes a single recursive rm fail with
// ENOTEMPTY; cleanup must never replace the real outcome of the turn.
export async function cleanupRuntimeRoot(runtimeRoot, { attempts = 6, delayMs = 250 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(runtimeRoot, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (attempt === attempts) {
        console.error(`PULSE could not remove Gemini's temporary home ${runtimeRoot}: ${error.message}`);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return false;
}

// Gemini is bimodal in practice: it answers in 10–60 s or never at all,
// printing nothing after startup. With stream-json every tool call and text
// delta is activity, so a long silence means a hang; one retry usually lands.
export async function invokeGemini({
  executable,
  projectRoot,
  prompt,
  timeoutMs = 120000,
  signal,
  model = null,
  attachments = [],
  lease = null,
  idleTimeoutMs = Number(process.env.PULSE_GEMINI_IDLE_MS ?? 90000),
  retries = Number(process.env.PULSE_GEMINI_RETRIES ?? 1),
  run = runReadonlyProcess,
}) {
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'pulse-gemini-'));
  const policyPath = join(runtimeRoot, 'readonly.toml');
  try {
    await writeFile(policyPath, lease ? geminiLeasePolicy(lease.outDir) : geminiReadonlyPolicy, { mode: 0o600 });
    await prepareGeminiHome({ runtimeRoot });
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        return await run({
          executable,
          args: buildGeminiArgs({ projectRoot, prompt, policyPath, model, attachmentsDir: attachments[0]?.dir ?? null, lease }),
          cwd: runtimeRoot,
          env: buildGeminiEnvironment({ runtimeRoot }),
          timeoutMs,
          idleTimeoutMs,
          signal,
          label: 'Gemini',
          parse: parseGeminiOutput,
        });
      } catch (error) {
        const produced = parseGeminiOutput(error.partialOutput ?? '').text;
        if (error.code === 'IDLE' && !produced && attempt <= retries && !signal?.aborted) {
          continue;
        }
        if (attempt > 1) error.message = `${error.message} (retried ${attempt - 1}×)`;
        throw error;
      }
    }
  } finally {
    void cleanupRuntimeRoot(runtimeRoot);
  }
}
