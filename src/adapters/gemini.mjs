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

export function buildGeminiArgs({ projectRoot, prompt, policyPath }) {
  return [
    '--approval-mode', 'plan',
    '--output-format', 'json',
    '--skip-trust',
    '--include-directories', projectRoot,
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

export function parseGeminiOutput(output) {
  try {
    const result = JSON.parse(output.trim());
    if (result.error) {
      return {
        text: '',
        usage: null,
        error: result.error.message ?? 'Gemini returned an error.',
      };
    }
    const models = Object.values(result.stats?.models ?? {});
    const totals = models.reduce((usage, model) => {
      const tokens = model?.tokens ?? {};
      usage.inputTokens += tokens.prompt ?? tokens.input ?? 0;
      usage.cachedInputTokens += tokens.cached ?? 0;
      usage.outputTokens += tokens.candidates ?? 0;
      usage.reasoningTokens += tokens.thoughts ?? 0;
      usage.totalTokens += tokens.total
        ?? ((tokens.prompt ?? tokens.input ?? 0) + (tokens.candidates ?? 0));
      return usage;
    }, {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      source: 'gemini-json',
    });
    return {
      text: typeof result.response === 'string' ? result.response.trim() : '',
      usage: models.length ? totals : null,
    };
  } catch {
    return { text: '', usage: null };
  }
}

export async function invokeGemini({ executable, projectRoot, prompt, timeoutMs = 120000, signal }) {
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'pulse-gemini-'));
  const policyPath = join(runtimeRoot, 'readonly.toml');
  try {
    await writeFile(policyPath, geminiReadonlyPolicy, { mode: 0o600 });
    await prepareGeminiHome({ runtimeRoot });
    return await runReadonlyProcess({
      executable,
      args: buildGeminiArgs({ projectRoot, prompt, policyPath }),
      cwd: runtimeRoot,
      env: buildGeminiEnvironment({ runtimeRoot }),
      timeoutMs,
      signal,
      label: 'Gemini',
      parse: parseGeminiOutput,
    });
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
}
