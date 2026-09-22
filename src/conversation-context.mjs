export function messageEntry(event) {
  if (event.type === 'message.failed') {
    // Failures are part of the conversation: an orchestrator closing a plan
    // must know that a step never answered, and why.
    const { messageId, target, error } = event.payload;
    if (typeof error !== 'string' || !error.trim()) return null;
    return { sequence: event.sequence, messageId: `${messageId}:failed`, role: 'failed', sender: target ?? 'room', target: 'you', text: error.trim() };
  }
  if (event.type === 'command.output') {
    const { name, title, text } = event.payload;
    if (typeof text !== 'string' || !text.trim()) return null;
    return { sequence: event.sequence, messageId: `${event.id}:command`, role: 'command', sender: `/${name}`, target: 'room', text: `${title}\n${text.trim()}`.slice(0, 6000) };
  }
  if (event.type !== 'message.created') return null;
  const { messageId, role, sender, target, text } = event.payload;
  if (typeof text !== 'string' || !text.trim()) return null;
  return { sequence: event.sequence, messageId, role, sender, target, text: text.trim() };
}

// `omitSynthetic` drops MADRE's own canned replies (identity, refusals, round-table plans):
// @madre must never read them back, or a small model starts echoing them.
// How much of the budget a window is cut back to when it finally has to let go of its oldest
// messages. Dropping one message per turn would move the start of the transcript on every turn;
// dropping a chunk at once and then holding still is what lets a CLI read most of it back from
// its own cache. Lower means longer stretches of stability and a leaner average window.
export const CONTEXT_KEEP = 0.62;

export function buildConversationContext(events, { excludeMessageId, maxChars = 16000, omitSynthetic = false, anchor = null } = {}) {
  const messages = events
    .map((event) => (omitSynthetic && event?.payload?.synthetic ? null : messageEntry(event)))
    .filter((message) => message && message.messageId !== excludeMessageId);
  const budget = Math.max(0, Number(maxChars) || 0);

  // The window is anchored, not sliding. A sliding window starts one message later on every
  // turn, so the transcript an agent reads begins with different words every time and none of
  // it can be matched against what it read last turn. Held still, the whole of it but the tail
  // is the same bytes as before, which is the difference between paying for it once and paying
  // for it every turn. It only ever moves when what has been said since no longer fits.
  const weigh = (from) => {
    let used = 0;
    for (let i = from; i < messages.length; i += 1) used += messages[i].sender.length + messages[i].role.length + messages[i].text.length + 4;
    return used;
  };
  let start = 0;
  if (Number.isInteger(anchor)) {
    const held = messages.findIndex((message) => message.sequence >= anchor);
    if (held >= 0 && weigh(held) <= budget) start = held;
  }
  if (!start || weigh(start) > budget) {
    // Let go of a chunk and then hold: back off until the window sits well under its budget, so
    // there is room for many turns of new words before it has to move again.
    start = messages.length;
    while (start > 0 && weigh(start - 1) <= budget * CONTEXT_KEEP) start -= 1;
  }

  const selected = [];
  let remaining = budget;

  for (let index = messages.length - 1; index >= start && remaining > 0; index -= 1) {
    const message = messages[index];
    const label = `${message.sender} (${message.role})`;
    const allowance = Math.max(0, remaining - label.length - 2);
    if (!allowance) break;
    const text = message.text.length > allowance
      ? allowance <= 3
        ? '.'.repeat(allowance)
        : `...${message.text.slice(message.text.length - allowance + 3)}`
      : message.text;
    selected.unshift({ ...message, text });
    remaining -= label.length + text.length + 2;
  }

  return {
    messages: selected,
    // Where this window begins, for the next turn to hold on to.
    anchor: selected[0]?.sequence ?? null,
    omittedMessages: messages.length - selected.length,
    firstSequence: selected[0]?.sequence ?? null,
    throughSequence: selected.at(-1)?.sequence ?? null,
    previousAgent: [...messages].reverse().find((message) => message.role === 'assistant')?.sender ?? null,
  };
}

export function formatConversationContext(context) {
  if (!context.messages.length) return '';
  const omitted = context.omittedMessages
    ? `[${context.omittedMessages} earlier message(s) omitted]\n`
    : '';
  const transcript = context.messages
    .map((message) => `${message.sender} (${message.role}): ${message.text}`)
    .join('\n\n');
  return `${omitted}${transcript}`;
}
