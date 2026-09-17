import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReadonlyProcess } from './process.mjs';

export const geminiReadonlyPolicy = `[[rule]]
toolName = "*"
decision = "deny"
priority = 998
interactive = false
denyMessage = "MADRE consultation mode only permits local project reads."

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

export const geminiWebPolicy = `
[[rule]]
toolName = ["google_web_search", "web_fetch"]
decision = "allow"
priority = 999
interactive = false
`;

export function geminiPolicy({ lease = null, scopes = null, imageStudio = null } = {}) {
  return `${lease ? geminiLeasePolicy(lease.outDir) : geminiReadonlyPolicy}${scopes?.web ? geminiWebPolicy : ''}${imageStudio && lease ? geminiImagePolicy(imageStudio) : ''}`;
}

// Gemini CLI reads "@something" in a prompt as a file to include, even in
// headless mode, and fuzzily resolves "@claude" to CLAUDE.md. Its parser skips
// an @ preceded by a backslash, so every handle goes in as \@name; the model
// is told what that means and its reply is unescaped on the way out.
export const GEMINI_MENTION_NOTE = 'Note: in this prompt every @handle is written as \\@handle (your CLI would otherwise read @name as a file to include). Read \\@name as @name and write handles plainly as @name in your reply.';
export function escapeGeminiMentions(text) {
  return String(text ?? '').replace(/(^|[^\\])@(?=[\w./~-])/g, '$1\\@');
}
export const unescapeGeminiMentions = (text) => String(text ?? '').replace(/\\@/g, '@');

export function buildGeminiArgs({ projectRoot, prompt, policyPath, model = null, attachmentsDir = null, lease = null }) {
  const includes = [projectRoot, attachmentsDir, lease?.outDir].filter(Boolean).join(',');
  const escaped = escapeGeminiMentions(prompt);
  const safePrompt = escaped !== prompt ? `${GEMINI_MENTION_NOTE}\n\n${escaped}` : prompt;
  return [
    ...(model && model !== 'auto' ? ['--model', model] : []),
    '--approval-mode', lease ? 'default' : 'plan',
    // stream-json emits init / tool_use / message deltas / result as JSONL, so
    // MADRE can tell a thinking Gemini from a hung one.
    '--output-format', 'stream-json',
    '--skip-trust',
    '--include-directories', includes,
    '--policy', policyPath,
    '--prompt', safePrompt,
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

export function isolateGeminiSettings(settings, { imageStudio = null } = {}) {
  const auth = settings?.security?.auth;
  const isolated = auth ? { security: { auth } } : {};
  if (imageStudio) {
    isolated.mcpServers = { [imageStudio.name]: { command: imageStudio.command, args: imageStudio.args, env: imageStudio.env, trust: true } };
  }
  return isolated;
}

export function geminiImagePolicy(imageStudio) {
  return `
[[rule]]
toolName = ["${imageStudio.tool}", "${imageStudio.name}__${imageStudio.tool}"]
decision = "allow"
priority = 1000
interactive = false
`;
}

export async function prepareGeminiHome({ runtimeRoot, sourceHome = join(homedir(), '.gemini'), imageStudio = null }) {
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
  await writeFile(join(geminiDir, 'settings.json'), JSON.stringify(isolateGeminiSettings(settings, { imageStudio })), { mode: 0o600 });
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
    return { text: typeof result.response === 'string' ? unescapeGeminiMentions(result.response.trim()) : '', usage: usageFromStats(result.stats) };
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
  return { text: unescapeGeminiMentions(text.trim()), usage, toolCalls, ...(error ? { error } : {}) };
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
        console.error(`MADRE could not remove Gemini's temporary home ${runtimeRoot}: ${error.message}`);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return false;
}

// Gemini CLI retries HTTP 429 (quota / rate limit) with exponential backoff
// and prints only stack traces to stderr while it waits. From the room that
// looked like a hang; naming it lets the human act on it.
export function diagnoseGeminiStderr(stderr) {
  const text = String(stderr ?? '');
  if (/prepayment credits are depleted/i.test(text)) {
    return { code: 'CREDITS_DEPLETED', message: 'Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.', hint: 'Add credits at https://ai.studio/projects, or switch the Gemini CLI to another key.' };
  }
  if (/status:\s*429|\b429\b|RESOURCE_EXHAUSTED|rate ?limit|quota exceeded/i.test(text)) {
    const router = /ClassifierStrategy|\.route\b/.test(text);
    return {
      code: 'RATE_LIMITED',
      message: `Google is rate-limiting this Gemini key (HTTP 429)${router ? ' while its "auto" router picked a model' : ''}; the CLI kept retrying with backoff.`,
      hint: 'Wait a minute, or pick an explicit model such as gemini-3-flash-preview to skip the router; check the key\'s quota at aistudio.google.com.',
    };
  }
  if (/status:?\s*503|UNAVAILABLE|high demand/i.test(text)) {
    return { code: 'UNAVAILABLE', message: 'Google reported the model as unavailable (HTTP 503) and the CLI kept retrying.', hint: 'Try again shortly or choose another model.' };
  }
  if (/status:\s*40[13]|PERMISSION_DENIED|API key not valid|IneligibleTierError/i.test(text)) {
    return { code: 'AUTH', message: 'Google rejected the Gemini credentials.', hint: 'Run `gemini` and use /auth, or check GEMINI_API_KEY.' };
  }
  return null;
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
  scopes = null,
  imageStudio = null,
  idleTimeoutMs = Number(process.env.PULSE_GEMINI_IDLE_MS ?? 90000),
  retries = Number(process.env.PULSE_GEMINI_RETRIES ?? 1),
  fallbackModel = process.env.PULSE_GEMINI_FALLBACK_MODEL ?? 'gemini-2.5-flash',
  failFastMs = 15000,
  run = runReadonlyProcess,
}) {
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'pulse-gemini-'));
  const policyPath = join(runtimeRoot, 'readonly.toml');
  try {
    await writeFile(policyPath, geminiPolicy({ lease, scopes, imageStudio: lease ? imageStudio : null }), { mode: 0o600 });
    await prepareGeminiHome({ runtimeRoot, imageStudio: lease ? imageStudio : null });
    let attempt = 0;
    let currentModel = model;
    let switched = false;
    for (;;) {
      attempt += 1;
      // The CLI retries a 503 or 429 with backoff for minutes while stderr
      // fills with stack traces. Read stderr as it comes and stop as soon as
      // the condition is clear: credits/auth at once, capacity after a grace.
      let firstSeenAt = null;
      const watchStderr = (stderr) => {
        const diagnosis = diagnoseGeminiStderr(stderr);
        if (!diagnosis) return null;
        firstSeenAt ??= Date.now();
        const terminal = diagnosis.code === 'CREDITS_DEPLETED' || diagnosis.code === 'AUTH';
        if (!terminal && Date.now() - firstSeenAt < failFastMs) return null;
        return Object.assign(new Error(`${diagnosis.message} ${diagnosis.hint}`), { code: diagnosis.code, diagnosis });
      };
      try {
        return await run({
          executable,
          args: buildGeminiArgs({ projectRoot, prompt, policyPath, model: currentModel, attachmentsDir: attachments[0]?.dir ?? null, lease }),
          cwd: runtimeRoot,
          env: buildGeminiEnvironment({ runtimeRoot }),
          timeoutMs,
          idleTimeoutMs,
          watchStderr,
          signal,
          label: 'Gemini',
          parse: parseGeminiOutput,
        });
      } catch (error) {
        const produced = parseGeminiOutput(error.partialOutput ?? '').text;
        const diagnosis = error.diagnosis ?? diagnoseGeminiStderr(error.partialStderr ?? error.stderr ?? '');
        if (diagnosis?.code === 'AUTH' || diagnosis?.code === 'CREDITS_DEPLETED') {
          error.message = `${diagnosis.message} ${diagnosis.hint}`;
          error.code = diagnosis.code;
          throw error;
        }
        // Capacity trouble (503) or a rate limit on the chosen model: one more
        // try on a lighter, explicit model before giving up.
        if ((diagnosis?.code === 'UNAVAILABLE' || diagnosis?.code === 'RATE_LIMITED') && !produced && !signal?.aborted && fallbackModel && !switched && currentModel !== fallbackModel) {
          switched = true;
          currentModel = fallbackModel;
          continue;
        }
        if (diagnosis?.code === 'UNAVAILABLE' || diagnosis?.code === 'RATE_LIMITED') {
          error.message = `${diagnosis.message} ${diagnosis.hint}${switched ? ` (also tried ${fallbackModel})` : ''}`;
          error.code = diagnosis.code;
          throw error;
        }
        if (error.code === 'IDLE' && !produced && attempt <= retries && !signal?.aborted) {
          continue;
        }
        if (diagnosis) error.message = `${error.message} ${diagnosis.message} ${diagnosis.hint}`;
        else if ((error.code === 'TIMEOUT' || error.code === 'IDLE') && error.partialStderr?.trim()) {
          const lastStderr = error.partialStderr.trim().split('\n').filter(Boolean).at(-1);
          if (lastStderr) error.message = `${error.message} stderr: ${lastStderr.slice(0, 200)}`;
        }
        if (attempt > 1) error.message = `${error.message} (retried ${attempt - 1}×)`;
        throw error;
      }
    }
  } finally {
    void cleanupRuntimeRoot(runtimeRoot);
  }
}
