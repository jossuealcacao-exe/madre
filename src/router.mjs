const supported = new Set(['codex', 'claude', 'gemini', 'opencode']);

export function parseMessage(text, fallbackTarget = null) {
  const value = String(text ?? '').trim();
  const match = value.match(/^@([a-z0-9_-]+)\b\s*/i);
  const mentioned = match?.[1]?.toLowerCase() ?? null;
  const target = mentioned && supported.has(mentioned) ? mentioned : fallbackTarget;
  return {
    text: match && target === mentioned ? value.slice(match[0].length).trim() : value,
    target,
    mentioned,
  };
}
