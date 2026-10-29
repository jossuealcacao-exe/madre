// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What a turn would cost at the provider's API list price, for the CLIs that do not say it
// themselves. Claude Code reports its own figure (`total_cost_usd`); Codex and Gemini report only
// tokens, and OpenCode reports 0 when the model runs on a subscription. So the room prices those
// turns from the table below — an estimate, said as one, never a bill.
//
// THE TABLE IS ONLY WHAT WAS READ AT THE SOURCE. Every row was read twice on the provider's own
// pricing page on PRICES_CHECKED; a model that is not here gets no price at all, never a guess
// from a model that looks like it. Prices are US dollars per million tokens, standard tier, short
// context (OpenAI ≤ 272K, Google ≤ 200K tokens per request). A turn can make several requests and
// the room only sees their sum, so the long-context rates are not applied: a turn with one very
// long request costs more than this says.
export const PRICES_CHECKED = '2026-10-09';
// Where they were read. Written down, never reached: MADRE does not fetch prices (no scheme here,
// so the outbound guard in test/outbound.test.mjs does not take them for destinations).
export const PRICE_SOURCES = Object.freeze({
  openai: 'developers.openai.com/api/docs/pricing',
  google: 'ai.google.dev/gemini-api/docs/pricing',
});

const LIST = Object.freeze({
  // OpenAI · input, cached input, output
  'gpt-6-sol': { input: 2.0, cached: 0.2, output: 10.0 },
  'gpt-6-luna': { input: 0.1, cached: 0.01, output: 0.5 },
  'gpt-5.6-sol': { input: 4.0, cached: 0.4, output: 20.0 },
  'gpt-5.6-terra': { input: 2.0, cached: 0.2, output: 12.0 },
  'gpt-5.6-luna': { input: 0.2, cached: 0.02, output: 1.2 },
  'gpt-5.5': { input: 5.0, cached: 0.5, output: 30.0 },
  // Google · input, context caching, output (thinking included)
  'gemini-3.1-pro-preview': { input: 2.0, cached: 0.2, output: 12.0 },
  'gemini-3-flash-preview': { input: 0.5, cached: 0.05, output: 3.0 },
  'gemini-2.5-pro': { input: 1.25, cached: 0.125, output: 10.0 },
  'gemini-2.5-flash': { input: 0.3, cached: 0.03, output: 2.5 },
});

// "openai/gpt-5.6-sol" (OpenCode's provider/model) and "models/gemini-2.5-pro" name the same rows.
export function listPrice(model) {
  if (typeof model !== 'string' || !model.trim()) return null;
  const id = model.trim().toLowerCase().split('/').at(-1);
  return Object.hasOwn(LIST, id) ? LIST[id] : null;
}

// How each CLI counts. `cachedIn`: the cached tokens are part of `inputTokens` (OpenAI and Google
// count them inside the prompt); OpenCode counts them apart. `reasoningIn`: the reasoning tokens
// are part of `outputTokens` (OpenAI's usage does); Gemini and OpenCode count them apart, and both
// providers bill them at the output rate.
const COUNTING = Object.freeze({
  'codex-json': { cachedIn: true, reasoningIn: true },
  'gemini-json': { cachedIn: true, reasoningIn: false },
  'opencode-json': { cachedIn: false, reasoningIn: false },
});

// Dollars for one model's share of a turn, or null when the model or the counting is unknown.
export function priceTokens(model, usage, source) {
  const price = listPrice(model);
  const counting = COUNTING[source];
  if (!price || !counting || !usage) return null;
  const n = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
  const cached = n(usage.cachedInputTokens);
  const fresh = counting.cachedIn ? Math.max(0, n(usage.inputTokens) - cached) : n(usage.inputTokens);
  const output = n(usage.outputTokens) + (counting.reasoningIn ? 0 : n(usage.reasoningTokens));
  return (fresh * price.input + cached * price.cached + output * price.output) / 1e6;
}

// A turn's usage with its estimate added, when the CLI did not give a figure of its own. A figure
// the CLI gave (above zero) is never replaced. The estimate carries which model and which date it
// was priced at, so the page can say so.
export function withListPrice(usage, model) {
  if (!usage || (Number.isFinite(usage.costUsd) && usage.costUsd > 0) || usage.local) return usage;
  const cost = priceTokens(model, usage, usage.source);
  if (cost === null) return usage;
  return { ...usage, costUsd: Math.round(cost * 1e6) / 1e6, costEstimated: true, pricedModel: String(model).split('/').at(-1), pricedAt: PRICES_CHECKED };
}
