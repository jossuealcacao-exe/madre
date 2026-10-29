// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
const supported = new Set(['codex', 'claude', 'gemini', 'opencode', 'cursor']);

export function parseMessage(text, fallbackTarget = null) {
  const value = String(text ?? '').trim();
  // The mention goes with the punctuation that hangs on it: «@madre, pregúntale al crew…» was kept
  // as «, pregúntale al crew…».
  const match = value.match(/^@([a-z0-9_-]+)\b[\s,:;]*/i);
  const mentioned = match?.[1]?.toLowerCase() ?? null;
  const target = mentioned && supported.has(mentioned) ? mentioned : fallbackTarget;
  return {
    text: match && target === mentioned ? value.slice(match[0].length).trim() : value,
    target,
    mentioned,
  };
}
