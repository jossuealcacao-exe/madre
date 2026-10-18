// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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
